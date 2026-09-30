# Recorder operator panel

Import the public `panel.json` into Remote LSL Recorder's **+** tab. It points
to the stable `/operator.html` entry, which restores correctly without URL query
settings. Approving the recorder's phone session mirrors that desktop panel;
**Share panel** generates its base-page link and QR locally.

The operator panel reuses the existing scene receiver and allowlisted receipts.
It waits for **Connect**; loading/restoring a tab does not start discovery or
an experiment. The ordinary `?view=companion` retains its existing automatic
policy. SDK 1.5.5 storage caches are disabled only when origin storage is denied,
allowing the recorder's opaque iframe without parent DOM/native access.

The scene link remains the existing public prototype, not BRSP mutual operator
authentication. Recorder approval does not add experiment identity or privacy.
WebXR entry still needs local headset confirmation. Target scene timing, research
semantics, receipts and safety limits are unchanged. Use either PC or phone as
the active controller where the target's peer policy requires it.

Follow [Remote Panel/1](https://github.com/GeorgeFejer91/Remote-LSL-Recorder/blob/main/docs/remote-panel-profile.md)
for descriptor bounds, isolation, mirroring and qualification. Browser embedding
checks do not qualify physical Quest/phone use, acoustic calibration or timing.
