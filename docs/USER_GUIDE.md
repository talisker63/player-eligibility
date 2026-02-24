# User Guide

## Getting Started

1. Sign in with your email and password, or use Sign in with Google.
2. On the main screen, you can upload a CSV file and check player eligibility.

## Obtaining the CSV File

1. Go to the [Bowls Victoria Weekend results portal](https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8) or the [Bowls Victoria Midweek results portal](https://results.bowlslink.com.au/event/acf7179a-2367-4254-86fc-8e87e2888534), depending on which competition you need.
2. In the grey title box, click **Event Info**.
3. Download the file: **"Rounds played per member, per competition * (download CSV file)"**.

## Uploading the CSV

1. Click **Choose File** (or equivalent) in the Rounds CSV section.
2. Select the downloaded CSV file.
3. The file is uploaded to storage and the app loads clubs and teams from it.
4. You can replace the file at any time by uploading a new CSV.

## How the data is analysed

- The CSV must include: **Surname**, **Name**, **Nominated Club**, **Team**, and **Total Rounds Played**.
- Each row is aggregated by player (surname + name), club, and team. Multiple rows for the same player at the same club and team are summed.
- If the spreadsheet has competition columns F–R (6th–18th columns), round totals are calculated from those columns.
- **6-A-Side and 7-A-Side columns are excluded** from totals and eligibility calculations.
- **Total Rounds Played** is only used when no competition-column data is present for that row.
- **Finals exclusion**: In included competition columns, any cell containing **(f)** is treated as a finals round. For each occurrence of **(f)**, 1 is subtracted from that row’s contribution to the total rounds. Finals rounds are not counted toward eligibility.

## Checking Eligibility

1. Choose a **Nominated club** from the dropdown.
2. Choose a **Team** from the dropdown (teams depend on the selected club).
3. Choose which **Rules** to apply (see Eligibility Rules below).
4. Click **Check eligibility**.
5. The list of eligible players appears below, with their total club games shown. Game counts are colour-coded: **red** indicates the player has played some games in higher sides (brought down); **green** indicates some games in lower sides (brought up); grey indicates an equal split.

## Viewing player details

- Click a player’s **name** in the eligible list to see how many games that player has played in each division/grade (team) for the nominated club.
- Click the **X** button to close the details view and return to the full list.

## Eligibility Rules

You can select which rule(s) to apply when checking eligibility:

- **Rule 1 (Four week rule)**: The player must have at least 4 games in the selected team or lower-grade sides for that club (e.g. for Premier 2, count games in Premier 2, Premier 3, etc.).
- **Rule 2 (51% rule)**: Fewer than 51% of the player’s club games were in teams higher than the selected team (e.g. Premier 1 is higher than Premier 2).
- **Both rules**: The player must satisfy both Rule 1 and Rule 2.

## Important Notice

This tool is an indicator only. Any results that look suspicious should be checked manually using the Bowls Victoria Spreadsheet.

## Help

Click the **?** icon in the top-right of the screen to open the help modal with more information.
