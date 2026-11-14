"""Volume engine against synthetic terrain with exactly known cut and fill volumes."""
import math

import numpy as np
import pytest
import rasterio
from pyproj import CRS
from rasterio.transform import from_origin
from shapely.geometry import Polygon, box

from app.geo.grid import WGS84, areal_scale_factor, reproject_geometry, utm_crs_for_geometry, utm_epsg_for
from app.geo.raster_io import RasterInputError, inspect_elevation_raster, prepare_surface
from app.geo.synthetic import Mound, write_synthetic_dem
from app.geo.volume import (
    AnalysisError,
    RegionSums,
    Surface,
    Uncertainty,
    compute_dod,
    finalize_volumes,
    measure_stable_ground,
    volume_sigma_m3,
)

EPSG = 32638
UTM = CRS.from_epsg(EPSG)
BOUNDS = (590000.0, 2677000.0, 591000.0, 2677800.0)
SITE_UTM = box(590100, 2677100, 590900, 2677700)
SITE_WGS84 = reproject_geometry(SITE_UTM, UTM, WGS84)
PILE = Mound(590200, 2677250, 590320, 2677350, height=3.0, ramp=10.0)
PIT = Mound(590600, 2677300, 590700, 2677380, height=-5.0, ramp=8.0)
ZONE_FILL = box(590180, 2677230, 590340, 2677370)
ZONE_CUT = box(590580, 2677280, 590720, 2677400)
REGIONS = {"site": SITE_UTM, "fill": ZONE_FILL, "cut": ZONE_CUT}
NOISE = 0.05
OFFSET = 0.75


def _prepared(tmp_path, name, **kwargs):
    raw = str(tmp_path / f"{name}_raw.tif")
    out = str(tmp_path / f"{name}.tif")
    params = {"epsg": EPSG, "bounds": BOUNDS, "resolution": 1.0}
    params.update(kwargs)
    write_synthetic_dem(raw, **params)
    prepare_surface(raw, out, UTM, SITE_WGS84, buffer_m=100)
    return out


@pytest.fixture(scope="module")
def surfaces(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("dem")
    return {
        "before": _prepared(tmp, "before", noise_sigma=NOISE, seed=1),
        "after": _prepared(tmp, "after", mounds=(PILE, PIT), noise_sigma=NOISE, seed=2, vertical_offset=OFFSET),
        "tmp": tmp,
    }


def _aligned_result(surfaces, lod_factor=1.96):
    before = Surface(surfaces["before"])
    found = measure_stable_ground(before, Surface(surfaces["after"]), [ZONE_FILL, ZONE_CUT], center=None)
    after = Surface(surfaces["after"], vertical_offset_m=found.median_m)
    residual = measure_stable_ground(before, after, [ZONE_FILL, ZONE_CUT], center=0.0)
    lod = lod_factor * residual.rmse_m
    u = Uncertainty(residual.rmse_m, residual.systematic_m, correlation_length_m=20.0, lod_m=lod)
    out = compute_dod(before, after, REGIONS, lod_m=lod)
    return found, residual, u, {k: finalize_volumes(v, out.pixel_area_m2, u) for k, v in out.sums.items()}, out


def test_synthetic_mound_volume_formula_matches_numeric_integration():
    x = np.arange(590150, 590400, 0.25) + 0.125
    y = np.arange(2677200, 2677400, 0.25) + 0.125
    xx, yy = np.meshgrid(x, y)
    assert PILE.heights(xx, yy).sum() * 0.25**2 == pytest.approx(PILE.volume, rel=1e-4)
    assert PILE.volume == pytest.approx(3.0 * (100 * 80 + 10 * 100 + 10 * 80 + 400 / 3))


def test_alignment_recovers_deliberate_vertical_offset(surfaces):
    found, residual, _, _, _ = _aligned_result(surfaces)
    assert found.median_m == pytest.approx(OFFSET, abs=0.005)
    assert abs(residual.median_m) < 0.005
    # Two independent surfaces of noise sigma each: difference noise is sigma * sqrt(2).
    assert residual.rmse_m == pytest.approx(NOISE * math.sqrt(2), rel=0.05)
    assert residual.nmad_m == pytest.approx(NOISE * math.sqrt(2), rel=0.05)
    assert residual.systematic_m is not None and residual.systematic_m < 0.01


def test_known_volumes_recovered_within_tolerance_and_stated_uncertainty(surfaces):
    _, _, _, results, _ = _aligned_result(surfaces)
    fill, cut, site = results["fill"], results["cut"], results["site"]

    assert fill.fill_m3 == pytest.approx(PILE.volume, rel=0.01)
    assert cut.cut_m3 == pytest.approx(PIT.volume, rel=0.01)
    assert abs(fill.fill_m3 - PILE.volume) <= fill.fill_pm_m3
    assert abs(cut.cut_m3 - PIT.volume) <= cut.cut_pm_m3
    # ... and the uncertainty is informative, not a blanket figure.
    assert 0 < fill.fill_pm_m3 < 0.05 * PILE.volume
    assert 0 < cut.cut_pm_m3 < 0.05 * PIT.volume

    # Zones do not leak into each other; what little noise exceeds the threshold where
    # nothing happened stays inside that side's own +/- range.
    assert fill.cut_m3 < 0.002 * PILE.volume and fill.cut_m3 <= fill.cut_pm_m3
    assert cut.fill_m3 < 0.002 * PIT.volume and cut.fill_m3 <= cut.fill_pm_m3
    # The site total sees both, and net = fill - cut.
    assert site.net_m3 == pytest.approx(PILE.volume - PIT.volume, abs=site.net_pm_m3)
    assert site.net_m3 == pytest.approx(site.fill_m3 - site.cut_m3)
    assert site.data_coverage == pytest.approx(1.0, abs=1e-3)


def test_without_alignment_the_offset_would_ruin_the_volumes(surfaces):
    out = compute_dod(Surface(surfaces["before"]), Surface(surfaces["after"]), REGIONS, lod_m=0.1)
    site_fill = out.sums["site"].fill_sum_m * out.pixel_area_m2
    assert site_fill > 10 * PILE.volume  # 0.75 m over 48 ha swamps the real change


def test_level_of_detection_suppresses_noise(surfaces):
    quiet = {"quiet": box(590400, 2677450, 590550, 2677650)}  # nothing happened here
    before = Surface(surfaces["before"])
    after = Surface(surfaces["after"], vertical_offset_m=OFFSET)
    no_lod = compute_dod(before, after, quiet, lod_m=0.0).sums["quiet"]
    with_lod = compute_dod(before, after, quiet, lod_m=4 * NOISE * math.sqrt(2)).sums["quiet"]
    assert no_lod.n_valid == 150 * 200
    assert no_lod.n_cut + no_lod.n_fill > 0.999 * no_lod.n_valid  # pure noise counted as change
    assert with_lod.n_cut + with_lod.n_fill < 0.001 * with_lod.n_valid
    result = finalize_volumes(with_lod, 1.0, Uncertainty(0.07, 0.0, 20.0))
    assert result.below_lod_area_m2 == pytest.approx(30000, rel=0.001)
    with pytest.raises(AnalysisError, match="level-of-detection"):
        compute_dod(before, after, quiet, lod_m=-1.0)


def test_zone_clipping_counts_only_pixels_inside_the_polygon(surfaces):
    before = Surface(surfaces["before"])
    after = Surface(surfaces["after"], vertical_offset_m=OFFSET)
    west_half = box(PIT.xmin - 20, PIT.ymin - 20, (PIT.xmin + PIT.xmax) / 2, PIT.ymax + 20)
    triangle = Polygon([(590600, 2677300), (590700, 2677300), (590600, 2677380)])
    outside = box(100000, 100000, 100100, 100100)
    out = compute_dod(before, after, {"half": west_half, "tri": triangle, "outside": outside}, lod_m=0.3)
    half = out.sums["half"].cut_sum_m * out.pixel_area_m2
    assert half == pytest.approx(PIT.volume / 2, rel=0.01)  # the pit is symmetric
    assert out.sums["half"].n_valid == round(west_half.area)
    assert out.sums["tri"].n_valid == pytest.approx(triangle.area, rel=0.01)
    assert out.sums["outside"].n_valid == 0
    assert finalize_volumes(out.sums["outside"], 1.0, Uncertainty(0.1, 0.1, 20)).data_coverage == 0.0


def test_dod_raster_is_written_as_cog_with_expected_values(surfaces):
    path = str(surfaces["tmp"] / "dod.tif")
    before = Surface(surfaces["before"])
    after = Surface(surfaces["after"], vertical_offset_m=OFFSET)
    out = compute_dod(before, after, REGIONS, lod_m=0.3, out_path=path)
    with rasterio.open(path) as dod:
        assert dod.crs.to_epsg() == EPSG and dod.overviews(1)
        centre_of_pit = next(dod.sample([(590650, 2677340)]))[0]
        centre_of_pile = next(dod.sample([(590260, 2677300)]))[0]
    assert centre_of_pit == pytest.approx(-5.0, abs=0.3)
    assert centre_of_pile == pytest.approx(3.0, abs=0.3)
    assert 2.5 < out.display_range_m <= 5.3


def test_geographic_input_is_reprojected_and_volumes_survive(tmp_path):
    """A DEM delivered in lon/lat degrees gives the same volumes as a UTM one."""
    def geographic(name, mounds):
        utm_path, geo_path = str(tmp_path / f"{name}_utm.tif"), str(tmp_path / f"{name}_geo.tif")
        write_synthetic_dem(utm_path, epsg=EPSG, bounds=BOUNDS, resolution=1.0, mounds=mounds)
        from rasterio.warp import Resampling, calculate_default_transform, reproject
        with rasterio.open(utm_path) as src:
            transform, width, height = calculate_default_transform(src.crs, "EPSG:4326", src.width, src.height, *src.bounds)
            profile = src.profile | {"crs": "EPSG:4326", "transform": transform, "width": width, "height": height}
            with rasterio.open(geo_path, "w", **profile) as dst:
                reproject(rasterio.band(src, 1), rasterio.band(dst, 1), resampling=Resampling.bilinear)
        out = str(tmp_path / f"{name}.tif")
        info = prepare_surface(geo_path, out, UTM, SITE_WGS84, buffer_m=50)
        assert info.epsg == EPSG and info.resolution_m == pytest.approx(1.0, rel=0.1)
        assert info.site_coverage == pytest.approx(1.0, abs=1e-3)
        return out

    out = compute_dod(Surface(geographic("a", ())), Surface(geographic("b", (PILE, PIT))), REGIONS, lod_m=0.05)
    assert out.sums["fill"].fill_sum_m * out.pixel_area_m2 == pytest.approx(PILE.volume, rel=0.02)
    assert out.sums["cut"].cut_sum_m * out.pixel_area_m2 == pytest.approx(PIT.volume, rel=0.02)


def test_different_resolutions_use_the_coarser_grid(tmp_path):
    fine = _prepared(tmp_path, "fine", resolution=0.5)
    coarse = _prepared(tmp_path, "coarse", resolution=2.0, mounds=(PILE, PIT))
    out = compute_dod(Surface(fine), Surface(coarse), REGIONS, lod_m=0.05)
    assert out.resolution_m == 2.0 and out.pixel_area_m2 == 4.0
    assert out.sums["fill"].fill_sum_m * 4.0 == pytest.approx(PILE.volume, rel=0.02)
    reverse = compute_dod(Surface(coarse), Surface(fine), REGIONS, lod_m=0.05)
    assert reverse.sums["fill"].cut_sum_m * 4.0 == pytest.approx(PILE.volume, rel=0.02)  # sign flips


def test_partial_coverage_is_reported(tmp_path):
    full = _prepared(tmp_path, "full")
    west_only = _prepared(tmp_path, "west", bounds=(590000.0, 2677000.0, 590500.0, 2677800.0), mounds=(PILE,))
    out = compute_dod(Surface(full), Surface(west_only), REGIONS, lod_m=0.05)
    u = Uncertainty(0.05, 0.01, 20)
    assert finalize_volumes(out.sums["site"], out.pixel_area_m2, u).data_coverage == pytest.approx(0.5, abs=0.01)
    assert finalize_volumes(out.sums["cut"], out.pixel_area_m2, u).data_coverage == 0.0
    assert finalize_volumes(out.sums["fill"], out.pixel_area_m2, u).data_coverage == pytest.approx(1.0, abs=0.01)


def test_no_overlap_between_epochs_is_a_clear_error(tmp_path):
    a, b = str(tmp_path / "a.tif"), str(tmp_path / "b.tif")
    write_synthetic_dem(a, epsg=EPSG, bounds=(590000, 2677000, 590200, 2677200), resolution=1.0)
    write_synthetic_dem(b, epsg=EPSG, bounds=(590500, 2677000, 590700, 2677200), resolution=1.0)
    with pytest.raises(AnalysisError, match="do not overlap"):
        compute_dod(Surface(a), Surface(b), {}, lod_m=0.1)
    with pytest.raises(AnalysisError, match="do not overlap"):
        measure_stable_ground(Surface(a), Surface(b), [])


def test_stable_ground_needs_enough_pixels(surfaces):
    everything = [box(*BOUNDS).buffer(500)]
    assert measure_stable_ground(Surface(surfaces["before"]), Surface(surfaces["after"]), everything) is None


def test_tilt_between_surveys_shows_up_as_systematic_error(tmp_path):
    flat = _prepared(tmp_path, "flat")
    tilted = _prepared(tmp_path, "tilted", slope=(0.002 + 0.0005, -0.001))  # 0.5 m per km
    stats = measure_stable_ground(Surface(flat), Surface(tilted), [], center=None)
    aligned = measure_stable_ground(Surface(flat), Surface(tilted, stats.median_m), [], center=0.0)
    assert aligned.systematic_m == pytest.approx(0.5 * 1.0 / math.sqrt(12), rel=0.15)  # uniform spread


def test_volume_uncertainty_propagation():
    px = 1.0
    # Systematic error scales with area; it does not average out.
    assert volume_sigma_m3(10_000, px, Uncertainty(0.0, 0.02, 20)) == pytest.approx(200.0)
    # Uncorrelated noise (L = 0) averages as sqrt(N).
    assert volume_sigma_m3(10_000, px, Uncertainty(0.1, 0.0, 0.0)) == pytest.approx(0.1 * 1.0 * 100)
    # Correlated noise: one independent sample per pi L^2 / 5.
    expected = 0.1 * 10_000 / math.sqrt(10_000 / (math.pi * 400 / 5))
    assert volume_sigma_m3(10_000, px, Uncertainty(0.1, 0.0, 20.0)) == pytest.approx(expected)
    # A region smaller than the correlation area is treated as fully correlated.
    assert volume_sigma_m3(100, px, Uncertainty(0.1, 0.0, 20.0)) == pytest.approx(0.1 * 100)
    # Both parts add in quadrature; zero area has zero uncertainty.
    both = volume_sigma_m3(10_000, px, Uncertainty(0.1, 0.02, 20.0))
    assert both == pytest.approx(math.hypot(expected, 200.0))
    assert volume_sigma_m3(0, px, Uncertainty(0.1, 0.02, 20.0)) == 0.0


def test_noise_above_threshold_is_covered_by_the_cut_and_fill_ranges(surfaces):
    """Unchanged ground: phantom cut and fill appear, cancel in net, and are within +/-."""
    quiet = {"quiet": box(590400, 2677450, 590550, 2677650)}
    sigma = NOISE * math.sqrt(2)
    before, after = Surface(surfaces["before"]), Surface(surfaces["after"], vertical_offset_m=OFFSET)
    for k in (0.0, 1.0, 1.96):
        out = compute_dod(before, after, quiet, lod_m=k * sigma)
        u = Uncertainty(sigma, 0.0, correlation_length_m=20.0, lod_m=k * sigma)
        r = finalize_volumes(out.sums["quiet"], out.pixel_area_m2, u)
        assert 0 < r.cut_m3 <= r.cut_pm_m3 and 0 < r.fill_m3 <= r.fill_pm_m3
        assert abs(r.net_m3) <= r.net_pm_m3
        assert r.cut_pm_m3 < 2.5 * r.cut_m3 + 150  # an allowance, not a blanket figure


def test_heavy_tailed_errors_are_covered_by_measured_leakage(tmp_path):
    """Sparse large errors (as on steep slopes) defeat the normal-noise formula; the
    leakage measured on stable ground keeps the +/- ranges honest."""
    before = _prepared(tmp_path, "b", noise_sigma=NOISE, seed=1)
    after_raw, after = str(tmp_path / "a_raw.tif"), str(tmp_path / "a.tif")
    write_synthetic_dem(after_raw, epsg=EPSG, bounds=BOUNDS, resolution=1.0, noise_sigma=NOISE, seed=2)
    with rasterio.open(after_raw, "r+") as dst:
        data = dst.read(1)
        rng = np.random.default_rng(3)
        spikes = rng.random(data.shape) < 0.02  # 2 % of pixels are badly wrong
        data[spikes] += rng.normal(0.3, 1.0, int(spikes.sum())).astype("float32")
        dst.write(data, 1)
    prepare_surface(after_raw, after, UTM, SITE_WGS84, buffer_m=100)

    zone = {"zone": ZONE_CUT}
    stats = measure_stable_ground(Surface(before), Surface(after), [ZONE_CUT], center=0.0, lod_sigma_multiplier=1.96)
    assert stats.leak_fill_m > stats.leak_cut_m > 0 and stats.leak_lod_m == pytest.approx(1.96 * stats.rmse_m)
    out = compute_dod(Surface(before), Surface(after), zone, lod_m=stats.leak_lod_m)
    plain = Uncertainty(stats.rmse_m, stats.systematic_m, 20.0, lod_m=stats.leak_lod_m)
    measured = Uncertainty(stats.rmse_m, stats.systematic_m, 20.0, lod_m=stats.leak_lod_m,
                           measured_leak_cut_m=stats.leak_cut_m, measured_leak_fill_m=stats.leak_fill_m)
    naive = finalize_volumes(out.sums["zone"], out.pixel_area_m2, plain)
    honest = finalize_volumes(out.sums["zone"], out.pixel_area_m2, measured)
    assert naive.fill_m3 > naive.fill_pm_m3  # nothing changed, yet the naive range excludes zero
    assert honest.fill_m3 <= honest.fill_pm_m3 and honest.cut_m3 <= honest.cut_pm_m3
    assert abs(honest.net_m3) <= honest.net_pm_m3
    assert honest.fill_pm_m3 < 3 * honest.fill_m3  # still proportionate


def test_net_uncertainty_covers_the_whole_changed_area():
    acc = RegionSums(region_area_m2=5000, n_valid=5000, n_cut=1000, n_fill=3000, cut_sum_m=2000, fill_sum_m=9000)
    u = Uncertainty(0.0, 0.05, 20.0, confidence_z=2.0)
    r = finalize_volumes(acc, 1.0, u)
    assert (r.cut_m3, r.fill_m3, r.net_m3) == (2000, 9000, 7000)
    assert (r.cut_pm_m3, r.fill_pm_m3, r.net_pm_m3) == pytest.approx((100, 300, 400))
    assert r.below_lod_area_m2 == 1000 and r.data_coverage == 1.0


# ------------------------------------------------------------------- CRS handling


def test_utm_zone_selection():
    assert utm_epsg_for(46.9, 24.2) == 32638  # Riyadh region
    assert utm_epsg_for(55.3, 25.2) == 32640  # Dubai
    assert utm_epsg_for(58.4, 23.6) == 32640  # Muscat
    assert utm_epsg_for(50.5, 26.1) == 32639  # Bahrain
    assert utm_epsg_for(18.4, -33.9) == 32734  # southern hemisphere
    assert utm_crs_for_geometry(SITE_WGS84).to_epsg() == EPSG


def test_pixel_area_is_corrected_for_utm_scale_distortion():
    on_central_meridian = areal_scale_factor(UTM, 45.0, 24.2)
    near_zone_edge = areal_scale_factor(UTM, 47.9, 24.2)
    assert on_central_meridian == pytest.approx(0.9996**2, rel=1e-6)
    assert near_zone_edge > 1.0003
    acc = RegionSums(100.0, n_valid=100, n_fill=100, fill_sum_m=100.0)
    volume = finalize_volumes(acc, 1.0 / near_zone_edge, Uncertainty(0, 0, 0)).fill_m3
    assert volume == pytest.approx(100 / near_zone_edge)


# ---------------------------------------------------------------------- bad inputs


def test_raster_without_crs_is_rejected(tmp_path):
    path = str(tmp_path / "nocrs.tif")
    write_synthetic_dem(path, epsg=EPSG, bounds=BOUNDS, resolution=5.0, with_crs=False)
    with pytest.raises(RasterInputError, match="no coordinate reference system"):
        inspect_elevation_raster(path, SITE_WGS84)


def test_raster_elsewhere_is_rejected_with_its_extent(tmp_path):
    path = str(tmp_path / "far.tif")
    write_synthetic_dem(path, epsg=32640, bounds=(300000, 2780000, 300500, 2780500), resolution=5.0)
    with pytest.raises(RasterInputError, match="does not overlap the site boundary"):
        inspect_elevation_raster(path, SITE_WGS84)


def test_multiband_and_non_raster_files_are_rejected(tmp_path):
    rgb = str(tmp_path / "rgb.tif")
    with rasterio.open(rgb, "w", driver="GTiff", dtype="uint8", count=3, width=10, height=10,
                       crs=f"EPSG:{EPSG}", transform=from_origin(590000, 2677800, 100, 100)) as dst:
        dst.write(np.zeros((3, 10, 10), dtype="uint8"))
    with pytest.raises(RasterInputError, match="3 bands"):
        inspect_elevation_raster(rgb, SITE_WGS84)
    junk = tmp_path / "junk.tif"
    junk.write_bytes(b"this is not a tiff")
    with pytest.raises(RasterInputError, match="could not be read"):
        inspect_elevation_raster(str(junk), SITE_WGS84)


def test_undeclared_nodata_sentinel_is_not_counted_as_terrain(tmp_path):
    raw, out = str(tmp_path / "raw.tif"), str(tmp_path / "out.tif")
    write_synthetic_dem(raw, epsg=EPSG, bounds=BOUNDS, resolution=2.0, nodata=None)
    with rasterio.open(raw, "r+") as dst:
        data = dst.read(1)
        data[:, :250] = -32767.0  # western half blank, sentinel not declared
        dst.write(data, 1)
    info = prepare_surface(raw, out, UTM, SITE_WGS84, buffer_m=100)
    assert 590 < info.min_m < info.max_m < 610
    assert info.site_coverage == pytest.approx(0.5, abs=0.02)


def test_inspect_accepts_good_raster(surfaces):
    summary = inspect_elevation_raster(surfaces["before"], SITE_WGS84)
    assert summary.band_count == 1 and "UTM zone 38N" in summary.crs_name
