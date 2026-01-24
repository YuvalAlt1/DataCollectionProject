$src = "c:\Users\yuval\OneDrive\Desktop\Courses\Semester G\Data Lab 1\Project\Hotel_data_interface.csv"
$dst = "C:\Users\yuval\.gemini\antigravity\scratch\rome_hotels_ui\data.js"

# Read Raw Content
$content = Get-Content $src -Raw

# Escape backticks using single quotes to avoid PowerShell escape issues
# In single quotes, ` is a literal backtick.
$content = $content.Replace('`', '\`')

# Define backtick char for clarity
$backtick = [char]96

# Construct JS
$js = "const CSV_DATA = $backtick" + $content + "$backtick;"

# Write to utf8
Set-Content -Path $dst -Value $js -Encoding UTF8

Write-Host "Successfully created data.js with $(($js.Length)) characters."
