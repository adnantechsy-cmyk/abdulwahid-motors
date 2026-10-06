# Car catalogue: specs, features, seeding

## Loading the 11 cars

```bash
php artisan migrate --force                 # adds vehicles.features
php artisan db:seed --class=CarSeeder --force
```

Creates BYD Seagull, Qin L, Qin Plus, Seal 06, Sealion 07, Song L, Song Plus, Song Pro, Leopard 7, Tang L and Tang, with the categories Hatchback / Sedan / SUV. Every new car is **unpublished**, its **price is hidden** ("Contact us for price") and it has no photo. In **Admin → Cars** add the photo, set the price (switch "Show the price" on), and tick "Show on the website".

Safe to run again: an existing car (matched by SKU) only gets what is still missing (new spec names, empty features, a brochure). Names, prices, status and the published flag are never overwritten.

**Brochures:** put each PDF in `storage/app/public/brochures/seed/` named after the car's web name, then run the seeder again:

`byd-seagull-2026.pdf`, `byd-qin-l-2026.pdf`, `byd-qin-plus-2025.pdf`, `byd-seal-06-2026.pdf`, `byd-sealion-07-2025.pdf`, `byd-song-l-2026.pdf`, `byd-song-plus-2025.pdf`, `byd-song-pro-2026.pdf`, `byd-leopard-7-2025.pdf`, `byd-tang-l-2026.pdf`, `byd-tang-2025.pdf`

(or upload them one by one in the admin). Run `php artisan storage:link` once if you have not.

## Spec names

A spec name ends in its unit, which is how the site knows what to print: `length_mm` → "3,780 mm". A value may be a number (`3780`), a range between versions (`1160 - 1240`), several values (`215 / 268`), or `2000+`. Three names hold a code instead of a number: `drive` (`fwd`, `awd`, `rwd`, `fwd_awd`, `varies`), `transmission` (`e_cvt`, `single_speed`, `varies`) and `engine_aspiration` (`na_atkinson`, `turbo`); the site shows the translated meaning.

| Section | Names |
|---|---|
| Dimensions and weight | `length_mm` `width_mm` `height_mm` `wheelbase_mm` `ground_clearance_mm` `curb_weight_kg` `cargo_l` `fuel_tank_l` `seats` |
| Powertrain and performance | `hybrid_system` `drive` `transmission` `engine_displacement_l` `engine_aspiration` `engine_power_hp` `engine_torque_nm` `motor_power_hp` `motor_torque_nm` `power_hp` `torque_nm` `acceleration_0_50_s` `acceleration_0_100_s` `top_speed_kmh` |
| Battery, charging, range | `battery_type` `battery_kwh` `range_km` `range_ev_km` `range_total_km` `consumption_kwh_100km` `fuel_consumption_l100` `charging_dc_kw` `dc_charge_time_min` `charging_ac_kw` `v2l_kw` |
| Wheels | `wheel_size_in` |

Any other name still works: it appears under "Other specifications" with its name written out. Arabic and English labels for the names above are in `messages/*.json` (`detail.specNames`).

## Features

"Label: value" lines in four sections (suspension, steering and brakes / exterior and lighting / interior and comfort / safety and driver assistance), one list per language. Edit them in **Admin → Cars → Features and equipment**. The car page shows the list for the visitor's language (English if that language is empty).

## Things in the source files to confirm

- **Sealion 07**, external power output: the file says "6 كم"; read as **6 kW**.
- **Model years:** only some files state one. Qin L, Seal 06, Seagull, Song L, Song Pro and Tang L use 2026 from their titles, Qin Plus 2025; **Sealion 07, Song Plus, Leopard 7 and Tang were given 2025**. Correct them in the admin if needed.
- **Seagull**, front seats: the file says "المقعد الخفي" (hidden seat); translated as the driver's seat.
- Cars sold in several versions (Qin Plus DM-i / EV, Tang L DM-i / DM-p / EV, Seal 06, Sealion 07 FWD / AWD) show **ranges across versions**. Per-version figures are in each car's description and features.
- The two "Seal 06 2026" files are identical (one car). That file describes the DM-i version only.
- Dimensions and performance numbers are taken as written in the files; they have not been checked against BYD's official data.