; Inno Setup 6 Script for Petros Autonomous Engineering & Operations AI
; Target: Windows 10 & 11 (64-bit)

#define MyAppName "Petros"
#define MyAppFullName "Petros Autonomous Engineering & Operations AI"
#define MyAppVersion "4.0.0"
#define MyAppPublisher "Petros AI Project"
#define MyAppURL "https://github.com/pedrammokarrami/Petros--code--agent"
#define MyAppExeName "Petros.exe"

[Setup]
AppId={{8F5A7B32-9214-4B2D-A48E-59D2E956C19F}
AppName={#MyAppFullName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppFullName}
DisableProgramGroupPage=yes
OutputDir=..\..\release
OutputBaseFilename=Petros-Setup
SetupIconFile=..\assets\petros.ico
UninstallDisplayIcon={app}\petros.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\staging\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppFullName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\petros.ico"
Name: "{group}\Petros (Safe Mode Console)"; Filename: "{app}\scripts\run-petros-windows.bat"; IconFilename: "{app}\petros.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppFullName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\petros.ico"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppFullName}}"; Flags: nowait postinstall skipifsilent

[Code]
// Custom Inno Setup Pascal code for cleanup and safe upgrade
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Do not delete user data in %APPDATA%\Petros or %USERPROFILE%\Desktop\petros
    // Only clean application binaries
  end;
end;
