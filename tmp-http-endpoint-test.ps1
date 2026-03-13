$ErrorActionPreference = 'Stop'

$port = 3011
$base = "http://127.0.0.1:$port"
$serverOut = "tmp-next-server.out.log"
$serverErr = "tmp-next-server.err.log"

if (Test-Path $serverOut) {
  try { Remove-Item $serverOut -Force -ErrorAction Stop } catch {}
}
if (Test-Path $serverErr) {
  try { Remove-Item $serverErr -Force -ErrorAction Stop } catch {}
}

$proc = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --port $port" -PassThru -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr

function Wait-ForServer {
  param([int]$maxSeconds = 120)
  $deadline = (Get-Date).AddSeconds($maxSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    try {
      $resp = Invoke-WebRequest -Uri "$base/login" -Method GET -TimeoutSec 10 -UseBasicParsing
      if ($resp.StatusCode -ge 200) { return $true }
    } catch {
      # keep trying
    }
  }
  return $false
}

function Call-Api {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    $Body = $null,
    [string]$Token = $null
  )

  $url = "$base$Path"
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }

  try {
    if ($null -ne $Body) {
      $json = $Body | ConvertTo-Json -Depth 10
      $resp = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -ContentType 'application/json' -Body $json -TimeoutSec 180 -UseBasicParsing
    } else {
      $resp = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -TimeoutSec 180 -UseBasicParsing
    }

    $parsed = $null
    try { $parsed = $resp.Content | ConvertFrom-Json } catch { $parsed = $resp.Content }

    return [PSCustomObject]@{
      name = $Name
      method = $Method
      path = $Path
      status = [int]$resp.StatusCode
      ok = $true
      body = $parsed
    }
  } catch {
    $status = 0
    $body = $_.Exception.Message

    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
        try { $body = $raw | ConvertFrom-Json } catch { $body = $raw }
      } catch {}
    }

    return [PSCustomObject]@{
      name = $Name
      method = $Method
      path = $Path
      status = $status
      ok = $false
      body = $body
    }
  }
}

$results = @()

try {
  if (-not (Wait-ForServer -maxSeconds 120)) {
    throw "Server did not become ready in time"
  }

  $results += Call-Api -Name 'auth.logout' -Method 'POST' -Path '/api/auth/logout'

  $signupEmail = "endpoint_test_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
  $results += Call-Api -Name 'auth.signup' -Method 'POST' -Path '/api/auth/signup' -Body @{
    name = 'Endpoint Test User'
    email = $signupEmail
    password = 'Password123!'
  }

  $signin = Call-Api -Name 'auth.signin' -Method 'POST' -Path '/api/auth/signin' -Body @{
    email = 'admin@test.com'
    password = 'password123'
  }
  $results += $signin

  $token = $null
  if ($signin.body -and $signin.body.token) {
    $token = [string]$signin.body.token
  }

  $results += Call-Api -Name 'packages.get' -Method 'GET' -Path '/api/packages'
  $results += Call-Api -Name 'packages.get.auth' -Method 'GET' -Path '/api/packages' -Token $token

  $createPkg = Call-Api -Name 'packages.post' -Method 'POST' -Path '/api/packages' -Token $token -Body @{
    name = "HTTP Test Package $(Get-Date -Format 'HHmmss')"
    speed = 42
    price = 49.5
    durationDays = 30
  }
  $results += $createPkg

  $packageId = $null
  if ($createPkg.body -and $createPkg.body.id) { $packageId = [string]$createPkg.body.id }

  if ($packageId) {
    $updatePkg = Call-Api -Name 'packages.put' -Method 'PUT' -Path "/api/packages/$packageId" -Token $token -Body @{
      name = 'HTTP Updated Package'
      speed = 60
      price = 59.5
      durationDays = 45
    }
    $results += $updatePkg
  } else {
    $results += [PSCustomObject]@{ name='packages.put'; method='PUT'; path='/api/packages/{id}'; status=0; ok=$false; body='Skipped: package not created' }
  }

  $results += Call-Api -Name 'clients.get' -Method 'GET' -Path '/api/clients'
  $getClientsAuth = Call-Api -Name 'clients.get.auth' -Method 'GET' -Path '/api/clients' -Token $token
  $results += $getClientsAuth

  $pkgForClient = $packageId
  if (-not $pkgForClient) {
    $getPkgs = Call-Api -Name 'packages.get.auth.retry' -Method 'GET' -Path '/api/packages' -Token $token
    $results += $getPkgs
    if ($getPkgs.body -is [System.Array] -and $getPkgs.body.Length -gt 0) {
      $pkgForClient = [string]$getPkgs.body[0].id
    }
  }

  $clientId = $null
  if ($pkgForClient) {
    $startDate = (Get-Date).ToString('o')
    $expiryDate = (Get-Date).AddDays(30).ToString('o')

    $createClient = Call-Api -Name 'clients.post' -Method 'POST' -Path '/api/clients' -Token $token -Body @{
      name = 'HTTP Test Client'
      phone = '+123456789'
      cnic = "35202-1234567-$(Get-Random -Minimum 0 -Maximum 9)"
      city = 'Karachi'
      country = 'Pakistan'
      packageId = $pkgForClient
      price = 49.5
      startDate = $startDate
      expiryDate = $expiryDate
      paymentStatus = 'paid'
      status = 'active'
      notes = 'Created by endpoint test'
    }
    $results += $createClient

    if ($createClient.body -and $createClient.body.id) {
      $clientId = [string]$createClient.body.id
      $results += Call-Api -Name 'clients.put' -Method 'PUT' -Path "/api/clients/$clientId" -Token $token -Body @{
        name = 'HTTP Test Client Updated'
        phone = '+123456789'
        cnic = "35202-1234567-$(Get-Random -Minimum 0 -Maximum 9)"
        city = 'Lahore'
        country = 'Pakistan'
        packageId = $pkgForClient
        price = 55
        startDate = $startDate
        expiryDate = (Get-Date).AddDays(35).ToString('o')
        paymentStatus = 'partial'
        status = 'suspended'
        notes = 'Updated by endpoint test'
      }

      $results += Call-Api -Name 'clients.delete' -Method 'DELETE' -Path "/api/clients/$clientId" -Token $token
    } else {
      $results += [PSCustomObject]@{ name='clients.put'; method='PUT'; path='/api/clients/{id}'; status=0; ok=$false; body='Skipped: client not created' }
      $results += [PSCustomObject]@{ name='clients.delete'; method='DELETE'; path='/api/clients/{id}'; status=0; ok=$false; body='Skipped: client not created' }
    }
  } else {
    $results += [PSCustomObject]@{ name='clients.post'; method='POST'; path='/api/clients'; status=0; ok=$false; body='Skipped: no package ID available' }
    $results += [PSCustomObject]@{ name='clients.put'; method='PUT'; path='/api/clients/{id}'; status=0; ok=$false; body='Skipped: no package ID available' }
    $results += [PSCustomObject]@{ name='clients.delete'; method='DELETE'; path='/api/clients/{id}'; status=0; ok=$false; body='Skipped: no package ID available' }
  }

  if ($packageId) {
    $results += Call-Api -Name 'packages.delete' -Method 'DELETE' -Path "/api/packages/$packageId" -Token $token
  } else {
    $results += [PSCustomObject]@{ name='packages.delete'; method='DELETE'; path='/api/packages/{id}'; status=0; ok=$false; body='Skipped: package not created' }
  }

  $results | ConvertTo-Json -Depth 20 | Set-Content tmp-endpoint-results.json
  Write-Output "WROTE_RESULTS tmp-endpoint-results.json"
}
finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
