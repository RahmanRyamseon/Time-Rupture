# How volumes and their uncertainty are calculated

This note explains, for clients and auditors, what the numbers in the dashboard and
reports mean and how they are produced. Every result also stores its own record of inputs
and settings (its *provenance*), so any figure can be traced and reproduced.

## 1. Inputs

- **Surveys (epochs)**: dated elevation models of the site (DEM/DSM), from satellite
  stereo or drone photogrammetry. Each survey is uploaded with the supplier's **stated
  vertical accuracy** and its **height reference** (vertical datum).
- **Baseline**: the survey every other survey is compared with. It is the first survey
  unless the analyst chooses another.
- **Design surface** (optional): the elevation model of the finished works.
- **Site boundary and zones**: polygons. Zones are the work areas (cut, fill, or both).

Surfaces are only compared when they use the same height reference. Mixing, for example,
ellipsoidal and sea-level heights would introduce errors of tens of metres in the Gulf, so
the system refuses it.

## 2. Preparing each surface

1. The raster is checked: it must have a coordinate reference system, a single elevation
   band and must overlap the site.
2. It is brought onto the site's **metric grid** — the local UTM zone — at its own native
   resolution, so that every pixel has a known size in metres. A file already in that
   UTM zone is copied without interpolation.
3. Values that cannot be terrain (undeclared "no data" markers) are discarded.
4. UTM maps are very slightly stretched (up to about 0.1 %). The area of a pixel is
   corrected for this, so volumes refer to true ground area.

## 3. Alignment

Two surveys of the same ground never agree exactly: each carries a small overall height
shift from its own processing. Left uncorrected, a shift of a few decimetres over a large
site would swamp the real earthworks.

For every survey the system measures the height difference from the baseline over
**stable ground** — everything outside the work zones, keeping a safety margin
(default 10 m) around each zone. The **median** of those differences is the survey's
vertical shift; it is removed before any comparison. The shift, the area of stable ground
used and the remaining disagreement are stored with the survey.

Only a vertical shift is corrected in this version. Horizontal misalignment and tilt are
not removed, but they are *measured* (section 5) and widen the stated uncertainty.

If a site has no usable stable ground, no shift is applied and the stated accuracies are
used instead (section 5).

## 4. Height change, cut and fill

For any two surfaces the **DEM of Difference** is: later surface minus earlier surface,
pixel by pixel. When resolutions differ, the finer surface is averaged onto the coarser
grid.

- **Fill** = the sum of all height *increases* × pixel area.
- **Cut** = the sum of all height *decreases* × pixel area.
- **Net** = fill − cut.

A pixel belongs to a zone when its centre is inside the zone polygon.

**Level of detection.** Height changes too small to distinguish from measurement noise
are not counted. The threshold is 1.96 × the pixel height error (section 5) unless the
analyst sets a value in metres. Consequence: a thin, real layer spread over a large area
can be under-counted. The dashboard reports the threshold used.

## 5. Uncertainty

Every volume is shown as *value ± range*. The range is a 95 % confidence interval
(1.96 standard deviations).

**Where the height error comes from.** The system measures, on stable ground, how much
the two aligned surveys still disagree:

- **Pixel error (σ_pixel)**: the root-mean-square disagreement, after discarding gross
  outliers. This is noise that differs from pixel to pixel.
- **Systematic error (σ_sys)**: the stable ground is divided into an 8 × 8 grid of blocks
  and the median disagreement of each block is taken. The spread of those block medians
  shows how much whole areas sit too high or too low (tilt, warping, residual shift).
  This error does **not** average out, however many pixels a zone has.

Fallbacks: when a survey is compared with the design surface (which has no error of its
own), the survey's alignment residuals against the baseline are used. When the baseline
itself is compared with the design, or when no stable ground can be measured, the
suppliers' stated accuracies are used and treated as fully systematic (the cautious
assumption).
The dashboard says which source was used.

**From height error to volume error**, for an area *A* that changed:

- systematic part = σ_sys × A
- random part = σ_pixel × A ÷ √N, where N is the number of *independent* measurements in
  the area. Neighbouring pixels share errors, so N is not the pixel count: one
  independent measurement is assumed per π·L²/5 of area, with L the error correlation
  length (default 20 pixels), following Rolstad et al. (2009).
- The two parts are combined as √(systematic² + random²), then multiplied by 1.96.

For **cut** and **fill** taken separately, an allowance is added for noise that happens
to exceed the level of detection on unchanged ground: it creates small phantom cut and
fill in equal amounts. They cancel in the net volume, so the allowance is not added there.

For the **net** volume, a shared height error raises fill and lowers cut together, so the
changed area *A* is the cut area plus the fill area.

## 6. Progress

Progress of a zone = volume achieved since the baseline ÷ volume the design requires from
the same baseline.

- Fill zones are measured by fill volume, cut zones by cut volume, and mixed zones by
  cut plus fill.
- The ± on progress combines the ranges of both volumes.
- Material placed above the design level, or dug below it, still counts as volume, so
  progress can exceed 100 %.

## 7. What these figures are not

- They measure the change of the **surface**. Compaction, bulking, settlement and material
  moved and replaced between two surveys are invisible.
- A DSM includes whatever stands on the ground — stockpiles, plant, structures.
- The uncertainty reflects elevation error only. It does not cover a wrong zone boundary,
  a wrong design file or a mislabelled height reference.
- The quality of the result is bounded by the input. At demonstration resolution
  (15–30 m satellite data) most earthworks fall below the level of detection.

## 8. Settings

All thresholds are configuration values recorded with each result: level-of-detection
multiplier, confidence level, correlation length, stable-ground margin, and the minimum
amount of stable ground. See `.env.example`.

## Reference

Rolstad, C., Haug, T. and Denby, B. (2009). Spatially integrated geodetic glacier mass
balance and its uncertainty based on geostatistical analysis. *Journal of Glaciology*,
55(192), 666–680.
