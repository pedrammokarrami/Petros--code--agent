========================================================================
PETROS - FEDORA / RHEL (.rpm) RELEASE SPECIFICATION
========================================================================

Architecture: x86_64
Target Output: petros-4.0.0-1.x86_64.rpm
Status: PENDING NATIVE RPMBUILD PACKAGING ON FEDORA/RHEL HOST

PACKAGING RECIPE:
------------------------------------------------------------------------
1. Install build tools:
   sudo dnf install rpm-build rpmdevtools

2. Setup rpmbuild tree:
   rpmdev-setuptree

3. Create petros.spec in ~/rpmbuild/SPECS/petros.spec:
   Name:           petros
   Version:        4.0.0
   Release:        1%{?dist}
   Summary:        Petros Autonomous Engineering & Operations AI Ecosystem
   License:        MIT
   URL:            https://github.com/pedrammokarrami/Petros--code--agent
   Requires:       nodejs >= 18.0.0

4. Build RPM:
   rpmbuild -ba ~/rpmbuild/SPECS/petros.spec
========================================================================
