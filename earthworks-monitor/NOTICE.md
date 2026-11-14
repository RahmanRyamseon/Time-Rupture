# Attribution

**Uses NASA Ames Stereo Pipeline (Apache-2.0).**

The worker image installs NASA Ames Stereo Pipeline (ASP), version 3.7.0, unmodified, from
its official conda package (`nasa-ames-stereo-pipeline` channel) and calls its command-line
tools. ASP is developed by the Intelligent Robotics Group at NASA Ames Research Center.
Its licence text is in `LICENSES/NASA-Ames-Stereo-Pipeline-Apache-2.0.txt`; the licences
of the third-party libraries it bundles are listed in the ASP documentation, "Third party
licenses".

If you publish results produced with ASP, its authors ask that you cite it:
Beyer, R. A., Alexandrov, O. and McMichael, S. (2018). The Ames Stereo Pipeline: NASA's
open source software for deriving and processing terrain data. *Earth and Space Science*,
5, 537–548.

The demonstration can use the Copernicus DEM GLO-30 (© DLR e.V. 2010–2014 and © Airbus
Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA;
all rights reserved) and ASTER Level 1A data (NASA / METI / AIST / Japan Space Systems and
the U.S./Japan ASTER Science Team).

The licence texts of every other bundled dependency are added with the final release
(Phase 4).
