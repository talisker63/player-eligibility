# User Guide

This tool checks which Bowls Victoria players are eligible to play for a selected team under the Four week rule or the 51% rule. Use it to see who qualifies for the last three games or finals.

---

## 1. What rules are being checked?

You can choose one of two eligibility rules. Both require players to have at least 4 club games.

- **Rule 1 (Four week rule):** The player must have at least 4 games in the selected team or lower-grade sides (e.g. for Premier 2, count Premier 2, Premier 3, and lower).

- **Rule 2 (51% rule):** Fewer than 51% of the player’s club games must have been in higher teams (e.g. Division 3 is higher than Division 4).

---

## 2. How to use the tool

### Step 1 — Get the CSV file

1. Go to the [Bowls Victoria Weekend results portal](https://results.bowlslink.com.au/event/888793b6-ee24-48f8-9eac-3895cea9f7f8) or [Midweek results portal](https://results.bowlslink.com.au/event/acf7179a-2367-4254-86fc-8e87e2888534).
2. In the grey title box, click **Event Info**.
3. Download the file: **"Rounds played per member, per competition * (download CSV file)"**.

### Step 2 — Upload the CSV

1. In the **Rounds CSV** section, click **Choose File**.
2. Select your downloaded CSV file.
3. The file is stored and used for all eligibility checks until you upload a new one.

### Step 3 — Run a check

1. Choose **Nominated club** from the dropdown.
2. Choose **Team** (teams show internal name and division, e.g. Ferntree Gully 3 - Div 4).
3. Select which **Rules** to apply (Four week rule or 51% rule).
4. Click **Check eligibility**.
5. The list of eligible players appears below.

---

## 3. How the results work

### Game count colours

Each player’s total club games is colour-coded:

- **Red** — Some games in higher sides (brought down)
- **Green** — Some games in lower sides (brought up)
- **Grey** — Equal split

### Sorting

Use the dropdown above the list to sort by Name A–Z, Name Z–A, Games Low–High, or Games High–Low.

### Player details

Click a player’s **name** to open their detail view:

- Games per team at the nominated club (each team shows its division and games played)
- For multi-club players: other clubs they have played for, with a breakdown by team and games at each other club (highest team to lowest)

Click **X** to close and return to the list.

### Multi-club player warnings

When the club has players who appear for more than one Nominated Club in the CSV, a warning banner is shown and each such player has an **Other club(s)** badge. Eligibility is calculated using only games at the nominated club; check the rules for multi-club players manually if needed.

### Download

Export the eligible list as **Text**, **PDF**, or **CSV** using the dropdown above the list.

---

## How the data is analysed

- The app reads **Surname**, **Name**, **Nominated Club**, **Team**, and **Total Rounds Played** from the CSV.
- Rows are aggregated by player, club, and team. Multiple rows for the same player at the same club and team are summed.
- **Finals rounds** are excluded from all eligibility calculations.
- **Division labels** (Premier, Premier Reserve, Div 1, Div 2, etc.) are read from the CSV headers.

---

## Important notice

This tool is for guidance only. Verify any eligibility decisions using the official Bowls Victoria spreadsheet.
