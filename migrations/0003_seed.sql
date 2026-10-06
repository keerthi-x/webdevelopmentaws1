-- Demo campus notices from other students so the boards are not empty.
-- Seed reporter ids are never the signed-in visitor, so they can claim these.

insert into items (
  id, reporter_id, kind, category, venue, title, description, verification_challenge, status, created_at
) values
  (
    'seed-found-id-tt',
    'seed-finder-ananya',
    'found',
    'ID Cards',
    'TT',
    'VIT ID card near TT lift lobby',
    'Blue VIT identity card found on the bench by the Technology Tower lift. Photo side was face-down. No cash or keys attached.',
    'What name and branch are printed on the ID tag?',
    'active',
    now() - interval '3 hours'
  ),
  (
    'seed-found-calc-lib',
    'seed-finder-rahul',
    'found',
    'Calculators',
    'Central Library',
    'Casio fx-991EX left on library L2',
    'Scientific calculator with a cracked corner bumper, found at a reading carrel on Central Library level 2 near the journals stacks.',
    'Is there a name or hostel sticker on the back cover?',
    'active',
    now() - interval '6 hours'
  ),
  (
    'seed-found-wallet-gazebo',
    'seed-finder-meera',
    'found',
    'Wallets',
    'Gazebo',
    'Black bifold wallet at Gazebo seating',
    'Leather bifold left on a Gazebo table after lunch rush. Cards were not removed. Please describe a unique card or photo inside — do not paste full numbers.',
    'What is the first name printed on the identity card inside?',
    'active',
    now() - interval '1 day'
  ),
  (
    'seed-found-lab-smv',
    'seed-finder-vikram',
    'found',
    'Lab Equipment',
    'SMV',
    'Physics lab multimeter in SMV corridor',
    'Handheld digital multimeter with red/black probes wrapped around the body. Found outside SMV lab 204 after the afternoon slot.',
    'What lab course code or name is written on the tape on the back?',
    'active',
    now() - interval '2 days'
  ),
  (
    'seed-found-earbuds-mall',
    'seed-finder-sara',
    'found',
    'Earphones',
    'Food Mall',
    'White TWS case at Food Mall billing',
    'Glossy white earbud case handed to the Food Mall billing counter. Charging port is a little dusty; no charm on the hinge.',
    'What is engraved or stickered on the inside of the lid?',
    'active',
    now() - interval '5 hours'
  ),
  (
    'seed-found-key-mhk',
    'seed-finder-dev',
    'found',
    'Room Keys',
    'MH-K',
    'MH-K room key on the G-block path',
    'Single brass hostel key on a faded blue lanyard, found on the path between MH-K and the bicycle stand.',
    'What block and room number are on the key tag?',
    'active',
    now() - interval '8 hours'
  ),
  (
    'seed-lost-id-sjt',
    'seed-loser-isha',
    'lost',
    'ID Cards',
    'SJT',
    'ID card missing after SJT CAT slot',
    'Lost my VIT ID after the morning CAT in SJT. Last seen at the ground-floor water cooler. Navy lanyard, third-year sticker on the back.',
    'What branch code and year sticker are on the back of the card?',
    'active',
    now() - interval '4 hours'
  ),
  (
    'seed-lost-key-foodmall',
    'seed-loser-arjun',
    'lost',
    'Room Keys',
    'Food Mall',
    'LH key misplaced between LH-D and Food Mall',
    'Room key with a small enamel charm went missing on the walk from LH-D to Food Mall around 8pm. Charm is a tiny book.',
    'What colour is the enamel charm and what room is on the tag?',
    'active',
    now() - interval '12 hours'
  ),
  (
    'seed-lost-calc-cdmm',
    'seed-loser-nisha',
    'lost',
    'Calculators',
    'CDMM',
    'Calculator missing from CDMM classroom',
    'Casio scientific calculator with a handwritten initial on the slide cover. Left in CDMM after a structures tutorial.',
    'What initial is written on the slide cover?',
    'active',
    now() - interval '2 days'
  ),
  (
    'seed-lost-wallet-sports',
    'seed-loser-kabir',
    'lost',
    'Wallets',
    'Sports Complex',
    'Wallet lost at Sports Complex court',
    'Canvas wallet dropped near the basketball court benches. Contains a mess card and a faded Polaroid, no cash.',
    'What is in the photo inside the wallet?',
    'active',
    now() - interval '9 hours'
  ),
  (
    'seed-resolved-id',
    'seed-finder-ananya',
    'found',
    'ID Cards',
    'MB',
    'ECE ID card — returned at MB lounge',
    'Resolved campus return. Kept on the board archive for recovery stats only.',
    'What name is on the card?',
    'resolved',
    now() - interval '5 days'
  ),
  (
    'seed-resolved-key',
    'seed-finder-rahul',
    'found',
    'Room Keys',
    'MH-B',
    'MH-B hostel key — handed back',
    'Resolved campus return at SJT Ground Floor Reception.',
    'What room number is on the tag?',
    'resolved',
    now() - interval '8 days'
  )
on conflict (id) do nothing;

update items
  set resolved_at = created_at + interval '1 day', resolved_by = reporter_id
  where id in ('seed-resolved-id', 'seed-resolved-key') and resolved_at is null;
