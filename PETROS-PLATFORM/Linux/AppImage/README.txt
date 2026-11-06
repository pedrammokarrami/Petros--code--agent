========================================================================
PETROS - LINUX APPIMAGE SPECIFICATION
========================================================================

Architecture: x86_64
Target Format: Petros-4.0.0-x86_64.AppImage
Status: PENDING NATIVE APPIMAGE CREATION ON LINUX BUILD HOST

PACKAGING RECIPE FOR LINUX HOST:
------------------------------------------------------------------------
1. Install appimagetool:
   wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
   chmod +x appimagetool-x86_64.AppImage

2. Create AppDir structure:
   mkdir -p Petros.AppDir/usr/bin
   mkdir -p Petros.AppDir/usr/lib/petros
   cp -r dist Petros.AppDir/usr/lib/petros/
   cp windows/assets/petros.png Petros.AppDir/petros.png
   cp scripts/petros.desktop Petros.AppDir/

3. Create AppRun launcher:
   cat << 'EOF' > Petros.AppDir/AppRun
   #!/bin/bash
   HERE="$(dirname "$(readlink -f "${0}")")"
   export PATH="${HERE}/usr/bin:${PATH}"
   cd "${HERE}/usr/lib/petros"
   exec node dist/server.cjs "$@"
   EOF
   chmod +x Petros.AppDir/AppRun

4. Build AppImage:
   ./appimagetool-x86_64.AppImage Petros.AppDir Petros-4.0.0-x86_64.AppImage
========================================================================
