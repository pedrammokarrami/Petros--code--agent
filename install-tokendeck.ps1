param([ValidateSet('doctor','install')][string]$Command='doctor',[switch]$DryRun)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
function Doctor { Write-Host ('{0,-14} {1,-8} {2}' -f 'TOOL','STATUS','PATH'); $m=Get-Content "$root\installer\prerequisites.json" | ConvertFrom-Json; foreach($x in @($m.required)+@($m.optional)){ $c=Get-Command $x.command -ErrorAction SilentlyContinue; if($c){ Write-Host ('{0,-14} {1,-8} {2}' -f $x.name,'found',$c.Source) } else { Write-Host ('{0,-14} {1,-8} {2}' -f $x.name,'missing','-') } } }
function Install-Tools { Doctor; if($DryRun){ Write-Host 'dry-run: no changes made'; return }; if(-not (Get-Command winget -ErrorAction SilentlyContinue)){ throw 'winget is required on Windows 10/11' }; $m=Get-Content "$root\installer\prerequisites.json" | ConvertFrom-Json; foreach($x in $m.required){ if(-not (Get-Command $x.command -ErrorAction SilentlyContinue) -and $x.install.windows){ winget install --exact --id $x.install.windows --accept-source-agreements --accept-package-agreements } }; Doctor }
if($Command -eq 'install'){Install-Tools}else{Doctor}
