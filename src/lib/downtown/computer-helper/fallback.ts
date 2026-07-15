import type { ComputerHelperPlan, HelperStep } from "./types";

type TopicId =
  | "wifi"
  | "printer"
  | "slow"
  | "bsod"
  | "update"
  | "password"
  | "email"
  | "browser"
  | "audio"
  | "disk"
  | "malware"
  | "display"
  | "generic";

type Template = {
  id: TopicId;
  match: RegExp;
  label: string;
  summarySteps: string[];
  detailedSteps: HelperStep[];
  option2: { summary: string; steps: HelperStep[] };
};

const TEMPLATES: Template[] = [
  {
    id: "wifi",
    match:
      /\b(wifi|wi-?fi|wireless|internet|network|ethernet|router|modem|dns|no.?connection|can'?t.?connect|won'?t.?connect)\b/i,
    label: "Wi‑Fi / network",
    summarySteps: [
      "Confirm other devices still reach the internet",
      "Toggle Wi‑Fi off and on (or Airplane Mode)",
      "Forget the network and reconnect with the password",
      "Power‑cycle the router/modem for 30 seconds",
      "Check DNS / renew the IP address",
      "Update or reinstall the Wi‑Fi adapter driver",
      "Test with a phone hotspot to isolate the PC vs. the LAN",
    ],
    detailedSteps: [
      {
        title: "Rule out a neighborhood outage",
        detail:
          "Open the same site or app on a phone (with Wi‑Fi on) or another laptop. If nothing works, the issue is likely the ISP or router — skip PC fixes and call the ISP or reboot network gear first.",
      },
      {
        title: "Quick wireless reset on the PC",
        detail:
          "On Windows: Settings → Network & internet → Wi‑Fi → turn off, wait 10 seconds, turn on. Or use Airplane Mode for 15 seconds. On Mac: turn Wi‑Fi off from the menu bar, wait, then reconnect.",
      },
      {
        title: "Forget and rejoin the network",
        detail:
          "Remove the saved network (Windows: Known networks → Forget; Mac: System Settings → Wi‑Fi → Details → Forget This Network). Rejoin and enter the password carefully — wrong passphrase is the most common “connected but no internet” cause on home SSIDs.",
      },
      {
        title: "Power‑cycle router and modem",
        detail:
          "Unplug modem and router power for a full 30 seconds. Plug the modem in first, wait until lights stabilize, then the router. Wait 2 minutes before testing again.",
      },
      {
        title: "Renew IP and flush DNS",
        detail:
          "Windows (Admin Command Prompt): `ipconfig /release` then `ipconfig /renew` then `ipconfig /flushdns`. Mac Terminal: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`. Also try switching DNS temporarily to 1.1.1.1 or 8.8.8.8.",
      },
      {
        title: "Driver / adapter check",
        detail:
          "Windows Device Manager → Network adapters → right‑click Wi‑Fi → Update driver (or Uninstall device and reboot to reinstall). Disable any VPN briefly; corporate VPN split‑tunnel issues often look like “no internet.”",
      },
      {
        title: "Hotspot isolation test",
        detail:
          "Join a phone hotspot. If that works, the PC stack is fine and the home network needs attention (channel congestion, ISP, bad cable). If the hotspot also fails, focus on OS firewall, proxy, or malware intervention next.",
      },
    ],
    option2: {
      summary:
        "Skip Wi‑Fi entirely: use Ethernet (or USB‑C/Thunderbolt dock Ethernet) to prove the PC can reach the internet, then fix wireless later.",
      steps: [
        {
          title: "Plug in wired Ethernet",
          detail:
            "Connect laptop → router LAN port with a known‑good cable. Disable Wi‑Fi so the OS prefers the wire. If browsers work, hardware wireless or RF interference is the culprit.",
        },
        {
          title: "Bypass the router once",
          detail:
            "If you have an ISP gateway, temporarily connect the PC straight to the modem (note: only one device usually gets an IP). Success means the router needs a factory reset or replacement.",
        },
        {
          title: "Guest network or new SSID",
          detail:
            "Create a guest SSID on the router with WPA2/WPA3 and a simple passphrase. Old IoT devices on the main network can saturate airtime; a clean SSID often restores laptops immediately.",
        },
      ],
    },
  },
  {
    id: "printer",
    match: /\b(print|printer|scanner|toner|inkjet|laserjet|airprint|spooler)\b/i,
    label: "Printer",
    summarySteps: [
      "Confirm paper, ink/toner, and that the printer is online",
      "Print a self‑test / configuration page from the printer",
      "Cancel stuck jobs and restart the print spooler",
      "Remove and re‑add the printer on the computer",
      "Match connection type: USB vs Wi‑Fi vs Ethernet",
      "Update the vendor driver or use IPP/AirPrint",
      "Test from another device to isolate PC vs printer",
    ],
    detailedSteps: [
      {
        title: "Physical basics",
        detail:
          "Paper loaded correctly, cartridges seated, no error lights, lid closed. Many “offline” states are just empty trays or open covers. Clear any jam path completely (check duplex units).",
      },
      {
        title: "Printer self‑test",
        detail:
          "Use the printer’s menu to print a test/config page. If that fails, stop troubleshooting the PC — service the hardware or replace consumables first.",
      },
      {
        title: "Clear the queue",
        detail:
          "Windows: Settings → Bluetooth & devices → Printers → Open queue → Cancel all. Then Services → restart “Print Spooler.” Mac: System Settings → Printers & Scanners → Open Print Queue → delete jobs; or `cancel -a` in Terminal.",
      },
      {
        title: "Re‑add the printer",
        detail:
          "Remove the device, reboot PC and printer, add again preferring the manufacturer’s current driver or the OS “IP” / AirPrint option. Avoid ancient USB drivers on modern Windows 11 if the printer supports IPP.",
      },
      {
        title: "Same subnet / same Wi‑Fi",
        detail:
          "Laptop on guest Wi‑Fi often cannot see a printer on the main LAN. Put both on the same SSID/VLAN, or use USB temporarily. Static IP on the printer helps flaky DHCP discovery.",
      },
      {
        title: "Driver freshness",
        detail:
          "Download the latest package from the vendor (HP/Epson/Brother/Canon), not a random mirror. Uninstall the old software suite first if installation fails halfway.",
      },
      {
        title: "Cross‑device test",
        detail:
          "Print a PDF from a phone via vendor app or AirPrint. If the phone works, the printer is fine — focus on the PC’s spooler and profile. If nothing prints, reset network settings on the printer.",
      },
    ],
    option2: {
      summary:
        "Bypass drivers: print via PDF / cloud / USB stick when a deadline matters more than fixing the driver stack.",
      steps: [
        {
          title: "Save as PDF and move",
          detail:
            "Export the document to PDF, copy to a USB drive, and use the printer’s walk‑up USB print (if available) or another working computer on the same network.",
        },
        {
          title: "Vendor cloud / email‑to‑print",
          detail:
            "Many business printers accept email‑to‑print or HP Smart / Epson Connect. Authenticate once on phone; send the job without local drivers.",
        },
        {
          title: "Alternate printer",
          detail:
            "Point the job at a nearby MFP or a paid copy shop while you schedule a clean OS reinstall of the print stack later.",
        },
      ],
    },
  },
  {
    id: "slow",
    match: /\b(slow|sluggish|lag|laggy|freez|hang|performance|cpu|ram|memory|startup|boot.?slow)\b/i,
    label: "Slow PC",
    summarySteps: [
      "Note when it is slow (boot, apps, or always)",
      "Check Task Manager / Activity Monitor for CPU, RAM, disk",
      "Close browser tab hogs and quit unused startup apps",
      "Free disk space (aim for >15% free on the system drive)",
      "Run OS Update and restart fully",
      "Scan for malware and unwanted PUPs",
      "Check thermal throttling (fans, dust, laptop on soft surfaces)",
      "If still bad: consider SSD health / Reset this PC last resort",
    ],
    detailedSteps: [
      {
        title: "Capture the pattern",
        detail:
          "Is it slow only after sleep, only in Chrome, or constantly? Pattern drives the fix. Also note recent installs, Windows updates, or filling the disk.",
      },
      {
        title: "Resource snapshot",
        detail:
          "Windows: Ctrl+Shift+Esc → Performance + Processes. Mac: Activity Monitor. Sort by CPU and Memory. If one process dominates, end it (or uninstall that app). Disk at 100% for minutes often means failing HDD or Search Indexer — note it.",
      },
      {
        title: "Startup and browser bloat",
        detail:
          "Disable nonessential startup items (Task Manager → Startup apps; Mac Login Items). In the browser, disable extensions and kill tabs with WebGL/video. One poorly coded extension can peg a core.",
      },
      {
        title: "Disk space",
        detail:
          "Delete Downloads clutter, empty Recycle Bin/Trash, run Storage Sense / Empty Caches. SSDs slow dramatically when nearly full. Move large media to an external drive.",
      },
      {
        title: "Updates + clean reboot",
        detail:
          "Install pending OS and GPU driver updates, then Restart (not just Shut down on modern Windows — use Restart so updates finish). After reboot, re‑check Task Manager.",
      },
      {
        title: "Malware / PUP pass",
        detail:
          "Windows Security full scan; optionally Malwarebytes free scan. Uninstall toolbars and “optimizer” junk from Settings → Apps. Mac: check Login Items and unexpected LaunchAgents.",
      },
      {
        title: "Heat and hardware",
        detail:
          "Feel the chassis. Blow dust from vents; use a hard surface. If fans scream and clock speeds drop, throttling is the slowdown. On older spinning disks, plan an SSD swap — biggest single upgrade.",
      },
      {
        title: "Last resorts",
        detail:
          "Check SMART health (CrystalDiskInfo / Disk Utility). Create a backup, then try Windows “Reset this PC” keep files, or macOS reinstall over the volume. Hardware RAM faults need a memtest.",
      },
    ],
    option2: {
      summary:
        "Work around the slow machine: lightweight apps + cloud PC / another device while you schedule deeper cleanup.",
      steps: [
        {
          title: "Use lean apps",
          detail:
            "Switch from Chrome to a single Edge/Safari window, use web Office or TextEdit instead of heavy suites, and close Slack/Teams overlays when not needed.",
        },
        {
          title: "Offload to another computer",
          detail:
            "Remote into a work desktop, use a library/office machine, or a cheap cloud workspace for the urgent task.",
        },
        {
          title: "Fresh user profile test",
          detail:
            "Create a new local user and log in. If that account is snappy, corrupt profile/startup is confirmed — migrate documents rather than fighting one profile forever.",
        },
      ],
    },
  },
  {
    id: "bsod",
    match: /\b(blue.?screen|bsod|stop.?code|kernel|crash|black.?screen|won't.?boot|wont.?boot|reboot.?loop|critical.?process)\b/i,
    label: "Crash / blue screen",
    summarySteps: [
      "Write down the stop code / when it happens",
      "Boot to Safe Mode if normal boot fails",
      "Unplug recent USB devices and extras",
      "Undo recent driver or Windows updates",
      "Run memory and disk diagnostics",
      "Update chipset / GPU / storage drivers carefully",
      "Repair system files (SFC / DISM) or Recovery options",
      "Backup data early if crashes are getting worse",
    ],
    detailedSteps: [
      {
        title: "Capture the code",
        detail:
          "Photograph the QR/stop code (e.g. SYSTEM_SERVICE_EXCEPTION, MEMORY_MANAGEMENT). Note if it happens in games, after sleep, or randomly. That string is gold for search later.",
      },
      {
        title: "Safe Mode entry",
        detail:
          "Hold Shift while clicking Restart → Troubleshoot → Advanced → Startup Settings → Safe Mode. Mac: Apple Diagnostics or boot to Recovery. Safe Mode lets you uninstall bad drivers.",
      },
      {
        title: "Hardware subtract",
        detail:
          "Remove brand‑new docks, USB HDDs, RGB hubs. Reseat RAM if comfortable. A flaky USB device causes surprising kernel crashes.",
      },
      {
        title: "Roll back updates/drivers",
        detail:
          "Settings → Windows Update → Update history → Uninstall updates. Device Manager → Roll Back Driver on display/network adapters updated the day crashes started.",
      },
      {
        title: "Diagnostics",
        detail:
          "Windows Memory Diagnostic; `chkdsk C: /f` from Recovery Command Prompt. Overheating GPUs under load: dust and power limits matter.",
      },
      {
        title: "Vendor drivers",
        detail:
          "Install chipset + GPU packages from Intel/AMD/NVIDIA/OEM laptop support page — not optional “bloat,” chipset often fixes WHEA errors.",
      },
      {
        title: "Repair install files",
        detail:
          "Admin CMD: `DISM /Online /Cleanup-Image /RestoreHealth` then `sfc /scannow`. If boot fails entirely, Startup Repair from WinRE or macOS Disk Utility First Aid.",
      },
      {
        title: "Preserve files",
        detail:
          "If bluescreens multiply, boot Safe Mode / WinRE and copy Documents to an external drive before attempting Reset. Data first, cleverness second.",
      },
    ],
    option2: {
      summary:
        "Minimize investigation time: boot a Linux or Windows USB live environment, copy data, then clean‑install the OS.",
      steps: [
        {
          title: "Live USB rescue",
          detail:
            "Create a Ubuntu or Windows Installer USB on another PC. Boot it, open files, and copy user folders to an external drive.",
        },
        {
          title: "Clean OS install",
          detail:
            "Backup done, wipe the system partition and reinstall. Reinstall only essential apps; old drivers are often what broke stability.",
        },
        {
          title: "Warranty path",
          detail:
            "If crashes persist on a clean OS with stock drivers, contact OEM support — likely RAM, storage, or motherboard.",
        },
      ],
    },
  },
  {
    id: "update",
    match: /\b(update.?stuck|stuck.?update|windows.?update|software.?update|0x800|pending.?reboot|installing.?updates|macOS.?update|failed.?update)\b/i,
    label: "Stuck update",
    summarySteps: [
      "Give a stuck progress bar time only if disk/CPU is active",
      "Restart cleanly and retry the update",
      "Free disk space (updates need several GB)",
      "Run Windows Update Troubleshooter or Mac Safe Mode retry",
      "Reset the Windows Update components (or download combo update)",
      "Pause other heavy downloads / VPN",
      "As last resort: in‑place repair install keeping files",
    ],
    detailedSteps: [
      {
        title: "Is it really stuck?",
        detail:
          "Open Task Manager. If disk/CPU activity continues, wait up to an hour on large feature updates — interrupting mid‑migrate can force recovery. If zero activity for 30+ minutes, proceed to reboot.",
      },
      {
        title: "Controlled restart",
        detail:
          "Use Restart from the Start menu when possible. If frozen hard, hold power 10 seconds, boot, then check Windows Update / Software Update again.",
      },
      {
        title: "Space and power",
        detail:
          "Keep the laptop plugged in. Free 10+ GB on C: or Macintosh HD. Feature updates abort quietly when space is tight.",
      },
      {
        title: "Built‑in repair tools",
        detail:
          "Windows: Settings → System → Troubleshoot → Other → Windows Update. Mac: boot Safe Mode and retry Software Update; or download the full installer from App Store / Apple support.",
      },
      {
        title: "Reset update stack (Windows)",
        detail:
          "Admin CMD scripts that stop wuauserv/bits, rename SoftwareDistribution and Catroot2, then restart services are a standard fix. Microsoft’s Update Assistant / Media Creation Tool can install the same build in‑place.",
      },
      {
        title: "Network quiet",
        detail:
          "Disable VPN, peer‑to‑peer delivery temporarily, and flaky guest Wi‑Fi. Wired Ethernet during the download reduces partial CAB failures.",
      },
      {
        title: "In‑place repair",
        detail:
          "Run setup from official ISO choosing Keep personal files and apps. Fixes component store corruption without wiping the profile.",
      },
    ],
    option2: {
      summary:
        "Stop fighting the updater: skip to a manual offline installer or delay non‑critical updates until a maintenance window.",
      steps: [
        {
          title: "Pause updates briefly",
          detail:
            "Pause for 1–2 weeks if you must ship work today. Document the pause so security updates resume soon.",
        },
        {
          title: "Offline / full package",
          detail:
            "Download the cumulative update MSU/Appx or the full macOS installer on another network, copy via USB, install locally.",
        },
        {
          title: "Defer feature updates",
          detail:
            "On Pro/Education, policy can defer feature updates while still allowing quality patches — reduces surprise multi‑GB stuck installs.",
        },
      ],
    },
  },
  {
    id: "password",
    match: /\b(password|passwd|passcode|login|sign.?in|locked.?out|forgot.?password|pin|bitlocker|filevault|2fa|mfa|authenticator)\b/i,
    label: "Password / login",
    summarySteps: [
      "Confirm Caps Lock / keyboard layout / correct account",
      "Use official “Forgot password” for that service or OS",
      "Check email/SMS/authenticator for MFA prompts",
      "Try another browser or private window (cached cookies)",
      "For local Windows PIN issues: switch to password then reset PIN",
      "Unlock BitLocker / FileVault only with recovery keys you stored",
      "Avoid random unlock tools — prefer vendor recovery",
    ],
    detailedSteps: [
      {
        title: "Input sanity",
        detail:
          "Watch the password field’s dots while typing a known phrase. Wrong layout (US vs international) and Caps Lock cause most “suddenly broken” passwords.",
      },
      {
        title: "Account recovery flow",
        detail:
          "Use the service’s own reset (Microsoft account, Google, Apple ID). Have recovery email/phone ready. Do not reuse password reset links from unsolicited email.",
      },
      {
        title: "MFA friction",
        detail:
          "Approve the push on the old phone, or use backup codes. If you lost the authenticator device, use the provider’s account recovery — expect identity verification delay.",
      },
      {
        title: "Clean browser session",
        detail:
          "Private window or different browser rules out bad cookies/extensions rewriting login pages (especially corporate SSO).",
      },
      {
        title: "Windows Hello / PIN",
        detail:
          "On the login screen choose Sign‑in options → password. Once in, Settings → Accounts → Sign‑in options → PIN → Remove and re‑add.",
      },
      {
        title: "Disk encryption keys",
        detail:
          "BitLocker recovery key is in your Microsoft account, printed sheet, or IT escrow. FileVault uses Apple ID or institutional escrow. Without the key, data may be unrecoverable — stop and escalate to IT.",
      },
      {
        title: "Skip shady tools",
        detail:
          "Third‑party “password removers” often trash the install or install malware. Prefer official reset environments or IT-managed imaging.",
      },
    ],
    option2: {
      summary:
        "Regain access via a second trusted device or IT reset instead of fighting the local login UI.",
      steps: [
        {
          title: "Phone / tablet session",
          detail:
            "If mobile apps are still signed in, change the password from there, then sign into the PC with the new credentials.",
        },
        {
          title: "Work account → IT helpdesk",
          detail:
            "Corporate laptops usually cannot be “cracked” at home. Open a ticket; admins reset Azure AD/Okta and wipe the TPM PIN safely.",
        },
        {
          title: "Local admin spare",
          detail:
            "If you previously created a second admin, boot and fix the primary profile from that account.",
        },
      ],
    },
  },
  {
    id: "email",
    match: /\b(email|outlook|gmail|mail\.app|thunderbird|smtp|imap|exchange|can't.?send|cant.?send|inbox)\b/i,
    label: "Email",
    summarySteps: [
      "Check status.office.com / Google Workspace status first",
      "Confirm connectivity (other websites load)",
      "Sign out/in or use a private browser window",
      "Verify SMTP/IMAP/Exchange settings and app passwords",
      "Clear Outlook OST issues / rebuild profile if corrupted",
      "Disable conflicting VPN or security suite mail scan briefly",
      "Test send/receive with a tiny plain‑text message",
    ],
    detailedSteps: [
      {
        title: "Provider outage?",
        detail:
          "Check the vendor status page and Downdetector. If the whole company is dark, wait — local fixes won’t help.",
      },
      {
        title: "Network baseline",
        detail:
          "Browse a few HTTPS sites. Captive portals and broken DNS break mail silently.",
      },
      {
        title: "Fresh web session",
        detail:
          "Try Outlook on the web / Gmail in a private window. If web works but the desktop app fails, the problem is the client profile, not the mailbox.",
      },
      {
        title: "Protocol settings",
        detail:
          "Confirm server names, SSL ports, and that “Less secure apps” / app‑specific passwords are set when 2FA is on. OAuth is preferred over stored passwords.",
      },
      {
        title: "Outlook profile repair",
        detail:
          "Create a new Outlook profile (Control Panel → Mail) or remove/re‑add the Mac account. Large corrupt OST files cause sync loops — recreation fixes them.",
      },
      {
        title: "Security software conflict",
        detail:
          "Temporarily disable mail‑scanning modules or VPN kill‑switches. Re‑enable after the test so you stay protected.",
      },
      {
        title: "Minimal send test",
        detail:
          "Send a one‑line message to yourself with no attachments. Attachment size limits and DLP policies often look like generic send failures.",
      },
    ],
    option2: {
      summary:
        "Use webmail or a secondary address to keep communicating while the desktop client is rebuilt.",
      steps: [
        {
          title: "Webmail only for a day",
          detail:
            "Conduct critical threads in the browser. Download important attachments to a known folder.",
        },
        {
          title: "Forwarding safety net",
          detail:
            "From a working session, set temporary forwarding to a personal address you control (follow company policy).",
        },
        {
          title: "New device profile",
          detail:
            "Configure mail on a phone with Exchange/Google defaults — validates credentials before touching the broken desktop profile again.",
        },
      ],
    },
  },
  {
    id: "browser",
    match: /\b(browser|chrome|edge|firefox|safari|webpage|website|tabs?|extension|certificate|ssl|hsts)\b/i,
    label: "Browser",
    summarySteps: [
      "Hard‑refresh or try a private/incognito window",
      "Test a second browser to isolate profile vs network",
      "Disable extensions; clear cache for the broken site",
      "Check system time (wrong clock breaks HTTPS)",
      "Flush DNS and try another network",
      "Reset the browser settings if still broken",
      "Update the browser fully and restart the PC",
    ],
    detailedSteps: [
      {
        title: "Incognito baseline",
        detail:
          "Private windows disable most extensions. If the site works there, an extension or cached cookie is guilty.",
      },
      {
        title: "Second browser",
        detail:
          "Open the same URL in Edge/Safari/Firefox. Works elsewhere → repair/reset the first browser’s profile.",
      },
      {
        title: "Extensions and cache",
        detail:
          "Disable ad blockers for the site, clear cached images/files (not necessarily all cookies if you can avoid re‑logins).",
      },
      {
        title: "Clock and TLS",
        detail:
          "Certificate errors often mean the PC clock is months off or enterprise SSL inspection needs the corporate root installed.",
      },
      {
        title: "DNS / network",
        detail:
          "Flush DNS, try phone hotspot. Some ISPs hijack failing DNS; switch to 1.1.1.1 experimentally.",
      },
      {
        title: "Reset settings",
        detail:
          "Chrome/Edge: Reset settings to default. Re‑enable extensions one by one. Export bookmarks first.",
      },
      {
        title: "Update + reboot",
        detail:
          "Install the latest browser build. Rare GPU process bugs clear after a full reboot.",
      },
    ],
    option2: {
      summary:
        "Bypass the sick profile: create a fresh browser profile or use another device for the task.",
      steps: [
        {
          title: "New profile",
          detail:
            "Chrome “Add profile” or Firefox profile manager. Sign into sync carefully; skip theme/extension packs until stable.",
        },
        {
          title: "Phone or another PC",
          detail:
            "Complete forms or banking on a known‑good device while you rebuild the desktop browser at leisure.",
        },
        {
          title: "Site status",
          detail:
            "If every network and browser fails, the website is down — check their status Twitter/statuspage before more local surgery.",
        },
      ],
    },
  },
  {
    id: "audio",
    match: /\b(sound|audio|speaker|microphone|mic|headset|mute|volume|no.?sound|can't.?hear|cant.?hear)\b/i,
    label: "Audio",
    summarySteps: [
      "Unmute hardware keys and OS volume mixer",
      "Confirm the correct playback / recording device is selected",
      "Replug headset; try another port or Bluetooth reset",
      "Run the OS audio troubleshooter",
      "Update or roll back the audio driver",
      "Disable audio enhancements / exclusive mode",
      "Test with a website tone generator and another app",
    ],
    detailedSteps: [
      {
        title: "Mute checklist",
        detail:
          "Physical mute keys, Windows volume mixer per‑app mute, Mac menu bar volume, and headset inline mute. Also check Zoom/Teams is not holding exclusive mute.",
      },
      {
        title: "Default device",
        detail:
          "Windows Sound settings: pick the real speakers/headphones, not HDMI on a silent monitor or a disabled Bluetooth sink. Mac: Sound → Output/Input.",
      },
      {
        title: "Cable / Bluetooth",
        detail:
          "Reseat 3.5mm fully; try USB headset on another port. Bluetooth: forget device, toggle Bluetooth, pair again.",
      },
      {
        title: "Troubleshooter / restart audio service",
        detail:
          "Windows audio troubleshooter; or restart Windows Audio service. Mac: kill coreaudiod via Activity Monitor (it relaunches).",
      },
      {
        title: "Drivers",
        detail:
          "Update Realtek/OEM audio from vendor support, or roll back if noise started after an update. Generic “High Definition Audio” sometimes works better than a broken OEM package.",
      },
      {
        title: "Enhancements off",
        detail:
          "Disable spatial sound, loudness equalization, and “exclusive mode” briefly when apps grab the device and silence others.",
      },
      {
        title: "Cross‑app test",
        detail:
          "Play a YouTube tone and a local music file. Mic: Voice Recorder / built‑in Sound settings level meter. Isolates playback vs capture.",
      },
    ],
    option2: {
      summary:
        "Use an alternate output path (USB headset, phone call, or HDMI display speakers) while the onboard audio is fixed.",
      steps: [
        {
          title: "USB or phone dock audio",
          detail:
            "Plug a cheap USB headset — bypasses onboard codecs entirely for meetings.",
        },
        {
          title: "Monitor HDMI audio",
          detail:
            "Set default playback to the monitor if it has speakers; good temporary path for media.",
        },
        {
          title: "Take the call on phone",
          detail:
            "Dial into Zoom/Teams from a mobile app so meetings continue during driver surgery.",
        },
      ],
    },
  },
  {
    id: "disk",
    match: /\b(disk.?full|storage.?full|out.?of.?space|low.?disk|cleanup|drive.?full|no.?space)\b/i,
    label: "Disk full",
    summarySteps: [
      "Confirm which volume is full (system vs secondary)",
      "Empty Recycle Bin / Trash and Downloads",
      "Use Storage settings to find large categories",
      "Clear browser caches, temp files, and old installers",
      "Move videos/photos to external or cloud",
      "Uninstall unused apps and optional Windows features",
      "After freeing 15%+, reboot and re‑measure",
    ],
    detailedSteps: [
      {
        title: "Identify the volume",
        detail:
          "Windows This PC / Mac About This Mac → Storage. Filling a data drive is annoying; filling the system drive breaks updates and hibernation.",
      },
      {
        title: "Quick wins",
        detail:
          "Empty Trash, clear Downloads, uninstall huge games you are not playing. Delete duplicate screen recordings.",
      },
      {
        title: "OS storage tools",
        detail:
          "Windows Storage Sense and “Temporary files.” Mac Storage Recommendations. Review iOS backups and Time Machine locals if applicable.",
      },
      {
        title: "Temp and caches",
        detail:
          "Disk Cleanup (Windows) including Windows Update cleanup. Docker images, Android emulators, and node_modules trees hide tens of GB.",
      },
      {
        title: "Media offload",
        detail:
          "Move Photos libraries and video projects to an external SSD; leave aliases/shortcuts if needed.",
      },
      {
        title: "Apps and features",
        detail:
          "Settings → Apps sort by size. Remove optional language packs and unused Office languages.",
      },
      {
        title: "Verify headroom",
        detail:
          "Reboot after cleanup so pagefile/update staging recalculates. Keep ≥15–20% free on SSDs for performance.",
      },
    ],
    option2: {
      summary:
        "Add capacity instead of deleting: external SSD, cloud sync with online‑only files, or a larger internal drive.",
      steps: [
        {
          title: "External working drive",
          detail:
            "Buy a USB SSD and move active projects there today — fastest relief with zero uninstall risk.",
        },
        {
          title: "Cloud online‑only",
          detail:
            "OneDrive/iCloud “Files On‑Demand” / Google Drive streaming keeps placeholders locally and content in the cloud.",
        },
        {
          title: "Plan an upgrade",
          detail:
            "Clone to a larger NVMe when external juggling becomes chronic. Backup first with a full disk image.",
        },
      ],
    },
  },
  {
    id: "malware",
    match: /\b(virus|malware|ransomware|spyware|adware|infected|pop-?ups?|hijack|trojan|defender)\b/i,
    label: "Malware / pop‑ups",
    summarySteps: [
      "Disconnect from networks if ransomware is suspected",
      "Note symptoms (pop‑ups, redirected search, crypto miners)",
      "Boot Safe Mode if the desktop is unusable",
      "Run Windows Security / XProtect full scans",
      "Add a second‑opinion scanner (e.g. Malwarebytes)",
      "Uninstall unknown apps and reset the browser",
      "Change passwords from a clean device afterward",
    ],
    detailedSteps: [
      {
        title: "Contain first",
        detail:
          "Unplug Ethernet / turn off Wi‑Fi if files are being encrypted or credentials may be stolen. Do not pay ransom without professional advice.",
      },
      {
        title: "Describe the behavior",
        detail:
          "Constant pop‑ups, new browser homepage, fans at 100% idle (miner), disabled Defender — each points to different cleanup intensity.",
      },
      {
        title: "Safe Mode",
        detail:
          "Enter Safe Mode with Networking only if you need definitions; otherwise offline Safe Mode for stubborn launch‑at‑boot junk.",
      },
      {
        title: "First‑party scan",
        detail:
          "Windows Security → Virus & threat protection → Full scan. Mac: update macOS and use Malwarebytes freely available build; reinstall apps from known sources.",
      },
      {
        title: "Second opinion",
        detail:
          "Malwarebytes or ESET online scanner. Quarantine findings; reboot; scan again until clean.",
      },
      {
        title: "Browser and apps",
        detail:
          "Reset browsers, remove unknown Chrome policies, uninstall Apps you do not recognize from last week’s Downloads.",
      },
      {
        title: "Credential hygiene",
        detail:
          "From a different clean computer, change email, bank, and work SSO passwords. Enable MFA. Assume typed passwords may have been logged.",
      },
    ],
    option2: {
      summary:
        "When infection is severe: backup personal files (scan them!), wipe the drive, reinstall OS, restore only known‑good documents.",
      steps: [
        {
          title: "Selective backup",
          detail:
            "Copy Documents/Pictures only; avoid restoring EXE/JS from Downloads. Scan the backup on a clean machine.",
        },
        {
          title: "Clean install",
          detail:
            "Reset this PC → Remove everything, or wipe via installer USB. Firmware passwords/BitLocker keys ready first.",
        },
        {
          title: "Hardening",
          detail:
            "Reinstall fewer apps, enable Defender real‑time, turn on automatic updates, and avoid cracked software — the usual infection vector.",
        },
      ],
    },
  },
  {
    id: "display",
    match: /\b(monitor|display|screen|resolution|flicker|black.?screen|no.?signal|hdmi|brightness|external.?display)\b/i,
    label: "Display",
    summarySteps: [
      "Check cables, input source, and monitor power",
      "Try a different cable / port / monitor",
      "Use Win+P / macOS Display settings to enable the screen",
      "Boot to Safe Mode if GPU driver black‑screens",
      "Update or roll back the graphics driver",
      "Reset resolution/refresh rate to defaults",
      "Test integrated vs discrete GPU if applicable",
    ],
    detailedSteps: [
      {
        title: "Cable and input",
        detail:
          "Reseat HDMI/DP fully; select the correct input on the monitor; try the monitor’s menu to prove the panel has power.",
      },
      {
        title: "Swap test",
        detail:
          "Another cable or another screen isolates PC GPU vs panel failure in minutes.",
      },
      {
        title: "OS projection mode",
        detail:
          "Windows Win+P cycle through PC screen only / Extend / Duplicate. Mac: Detection via Option‑click Detect Displays in older settings; close the lid test on clamshell setups carefully.",
      },
      {
        title: "Safe Mode graphics",
        detail:
          "If you installed a bad GPU driver and get black screens after login, Safe Mode → Device Manager → roll back or use DDU in Safe Mode on Windows.",
      },
      {
        title: "Driver channel",
        detail:
          "Clean‑install GPU drivers from NVIDIA/AMD/Intel. Laptop users prefer OEM packages when hybrid graphics misbehave.",
      },
      {
        title: "Timing defaults",
        detail:
          "Drop to 60 Hz and native resolution. Overclocked refresh on a marginal cable looks like random blackouts.",
      },
      {
        title: "GPU path",
        detail:
          "On desktops, move the cable to the motherboard I/O (iGPU) to see if the discrete card died. Reseat power connectors on the GPU.",
      },
    ],
    option2: {
      summary:
        "Keep working on a second screen / remote session while display hardware is sorted.",
      steps: [
        {
          title: "Remote desktop in",
          detail:
            "From a phone or another PC use Quick Assist / Chrome Remote Desktop / SSH to fix drivers without seeing the local panel.",
        },
        {
          title: "TV as monitor",
          detail:
            "Many HDTVs accept HDMI at 1080p — fine for email and web while the main panel is RMA’d.",
        },
        {
          title: "Laptop lid only",
          detail:
            "Ignore the broken external; use the built‑in display until a replacement cable/dock arrives.",
        },
      ],
    },
  },
];

const GENERIC: Template = {
  id: "generic",
  match: /.*/,
  label: "General troubleshooting",
  summarySteps: [
    "Restart the computer and the affected device/app",
    "Reproduce the issue and note exact error text",
    "Check cables, power, and network in that order",
    "Update the OS and the specific application/driver",
    "Try a clean environment (private browser / another user / Safe Mode)",
    "Undo the last change (new software, update, or peripheral)",
    "Search the exact error on vendor support + Microsoft/Apple docs",
    "Backup important files before deeper repairs",
    "Escalate to a repair shop or IT with notes in hand",
  ],
  detailedSteps: [
    {
      title: "Restart cleanly",
      detail:
        "Save work, Restart the PC (not only Sleep), and power‑cycle external gear. Clears stuck processes and half‑applied updates more often than any clever fix.",
    },
    {
      title: "Write down the failure",
      detail:
        "Exact dialog text, when it started, and whether it is intermittent. Photos of error codes beat vague “it doesn’t work” when you ask for help later.",
    },
    {
      title: "Physical layer",
      detail:
        "Seated power/data cables, charged laptop, known‑good outlet, Ethernet vs Wi‑Fi. Many “software” tickets are unplugged docks.",
    },
    {
      title: "Update what is involved",
      detail:
        "OS Update + the specific app/driver related to the symptom. Avoid random “optimizer” tools.",
    },
    {
      title: "Isolate variables",
      detail:
        "Private browser, another user account, Safe Mode, or another network. Isolation tells you profile vs system vs LAN.",
    },
    {
      title: "Rollback last change",
      detail:
        "Uninstall yesterday’s app, roll back a driver, or remove a new USB gadget. Correlation with “started after…” is your best clue.",
    },
    {
      title: "Targeted documentation search",
      detail:
        "Quote the error in search with the product name. Prefer vendor KB, Microsoft Learn, Apple Support over forum malware bait.",
    },
    {
      title: "Backup before big moves",
      detail:
        "Copy Documents to external/cloud before Reset, disk checks, or registry experiments.",
    },
    {
      title: "Know when to escalate",
      detail:
        "Bring your note trail to IT or a shop. Hardware diagnostics (RAM, disk SMART) after software avenues fail.",
    },
  ],
  option2: {
    summary:
      "Work around the broken component with a different app, device, or cloud tool while scheduling a proper fix.",
    steps: [
      {
        title: "Alternate app or device",
        detail:
          "Phone hotspot instead of home Wi‑Fi, web app instead of desktop client, another PC at work/library.",
      },
      {
        title: "Restore point / Time Machine",
        detail:
          "If the machine worked yesterday, roll back the OS to that point before chasing individual symptoms.",
      },
      {
        title: "Professional help with context",
        detail:
          "Hand the technician your reproduction steps and backups. It halves repair time and reduces “we wiped it” surprises.",
      },
    ],
  },
};

function pickTemplate(query: string): Template {
  for (const t of TEMPLATES) {
    if (t.match.test(query)) return t;
  }
  return GENERIC;
}

/** Enrich generic plans with the user’s wording without inventing unsafe advice. */
function personalize(plan: ComputerHelperPlan, query: string): ComputerHelperPlan {
  const q = query.trim();
  if (!q) return plan;
  const intro = `For “${q.length > 120 ? `${q.slice(0, 117)}…` : q}”: `;
  return {
    ...plan,
    summarySteps: plan.summarySteps.map((s, i) => (i === 0 ? `${intro}${s}` : s)),
  };
}

export function offlineComputerHelperPlan(query: string): ComputerHelperPlan {
  const t = pickTemplate(query);
  const base: ComputerHelperPlan = {
    query: query.trim(),
    summarySteps: [...t.summarySteps],
    detailedSteps: t.detailedSteps.map((s) => ({ ...s })),
    option2: {
      summary: t.option2.summary,
      steps: t.option2.steps.map((s) => ({ ...s })),
    },
    mode: "offline",
    topic: t.label,
    note: "Offline helper (no LLM key or model unavailable) — heuristic playbook.",
  };
  return personalize(base, query);
}

export function detectTopicLabel(query: string): string {
  return pickTemplate(query).label;
}
