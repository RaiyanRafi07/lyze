; LeetCode Lab Windows installer outline (Inno Setup, not yet executed).
; Staged proposal: copies the portable tree built by packaging/stage.py,
; keeps the exe-adjacent resource root intact, and records the install.
; Build only on a machine with Inno Setup 6 installed:
;   iscc desktop/packaging/leetlab.iss
#define AppVersion "0.1.2"
#define StageDir "..\target\pkg-win-final\LeetCodeLab"

[Setup]
AppId=LeetCode Lab
AppName=Lyze
AppVersion={#AppVersion}
AppPublisher=Lyze
DefaultDirName={localappdata}\LeetCodeLab
DefaultGroupName=Lyze
OutputBaseFilename=Lyze-Setup-{#AppVersion}-x64
SetupIconFile=lyze.ico
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
UninstallDisplayName=Lyze
UninstallDisplayIcon={app}\lyze.ico

[Files]
Source: "{#StageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "lyze.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\Lyze"; Filename: "{app}\leetlab-app.exe"; WorkingDir: "{app}"; IconFilename: "{app}\lyze.ico"
Name: "{userdesktop}\Lyze"; Filename: "{app}\leetlab-app.exe"; WorkingDir: "{app}"; IconFilename: "{app}\lyze.ico"; Tasks: desktopicon

[Tasks]
Name: desktopicon; Description: "Create a &desktop icon"; Flags: unchecked

[Run]
Filename: "{app}\leetlab-app.exe"; Description: "Launch Lyze"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
