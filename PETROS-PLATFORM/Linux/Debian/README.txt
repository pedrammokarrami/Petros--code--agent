========================================================================
PETROS - DEBIAN / UBUNTU (.deb) RELEASE SPECIFICATION
========================================================================

Architecture: amd64 (x86_64)
Target Output: petros_4.0.0_amd64.deb
Status: PENDING NATIVE DPKG PACKAGING ON DEBIAN/UBUNTU HOST

PACKAGING RECIPE:
------------------------------------------------------------------------
1. Install build tools:
   sudo apt-get install dpkg-dev debhelper

2. Prepare Debian package directory:
   mkdir -p petros-deb/DEBIAN
   mkdir -p petros-deb/opt/petros
   mkdir -p petros-deb/usr/bin
   mkdir -p petros-deb/usr/share/applications

3. Write control file (petros-deb/DEBIAN/control):
   Package: petros
   Version: 4.0.0
   Section: devel
   Priority: optional
   Architecture: amd64
   Depends: nodejs (>= 18.0.0)
   Maintainer: Petros Team <support@petros.ai>
   Description: Petros Autonomous Engineering & Operations AI Ecosystem

4. Copy payload:
   cp -r dist petros-deb/opt/petros/
   cp scripts/run-petros-linux.sh petros-deb/usr/bin/petros
   chmod +x petros-deb/usr/bin/petros
   cp scripts/petros.desktop petros-deb/usr/share/applications/

5. Build deb:
   dpkg-deb --build petros-deb petros_4.0.0_amd64.deb
========================================================================
