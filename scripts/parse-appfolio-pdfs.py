#!/usr/bin/env python3
"""Parse AppFolio Property / Unit / Tenant Directory PDF text extracts → JSON."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "data" / "appfolio-staging"

KNOWN_CITIES = [
    "McKees Rocks",
    "Mckees Rocks",
    "Mckess Rocks",
    "West Mifflin",
    "Turtle Creek",
    "South Park",
    "East McKeesport",
    "McKeesport",
    "Munhall",
    "Glassport",
    "Homestead",
    "Braddock",
    "Duquesne",
    "Duquense",
    "Carnegie",
    "Carneige",
    "Etna",
    "Rochester",
    "Swissvale",
    "Wilkinsburg",
    "Pittsburgh",
    "Pittsbrugh",
    "Crafton",
    "Ingram",
    "Bellevue",
    "Millvale",
    "Sharpsburg",
    "Avalon",
    "Ben Avon",
    "Mount Oliver",
    "Mt Oliver",
    "Castle Shannon",
    "Whitehall",
    "Brentwood",
    "Dormont",
    "Green Tree",
    "Greentree",
    "McDonald",
    "Imperial",
    "Coraopolis",
]


def norm_city(city: str) -> str:
    c = city.strip()
    fixes = {
        "Pittsbrugh": "Pittsburgh",
        "Duquense": "Duquesne",
        "Carneige": "Carnegie",
        "Mckess Rocks": "McKees Rocks",
        "Mckees Rocks": "McKees Rocks",
    }
    return fixes.get(c, c)


def split_street_city(body: str) -> tuple[str, str]:
    body = re.sub(r"\s+", " ", body).strip()
    for city in sorted(KNOWN_CITIES, key=len, reverse=True):
        if body.endswith(" " + city) or body.endswith(city):
            street = body[: -len(city)].strip(" -")
            return street, norm_city(city)
    parts = body.split()
    if len(parts) >= 2:
        return " ".join(parts[:-1]), norm_city(parts[-1])
    return body, "Pittsburgh"


def keep_unit_line(s: str) -> bool:
    if not s:
        return False
    if s.startswith(
        (
            "Created on",
            "Unit Directory",
            "Unit Name",
            "Properties:",
            "Units:",
            "Deposit Sqft",
            "Market Rent",
        )
    ):
        return False
    return True


def parse_units(text: str) -> list[dict]:
    header_re = re.compile(
        r"^(?P<label>.+?)\s+-\s+(?P<body>.+),\s*(?P<st>[A-Z]{2})\s+(?P<zip>\d{5})$"
    )
    money = r"(?:\d{1,3}(?:,\d{3})*(?:\.\d{2})?)"
    data_re = re.compile(
        rf"^(?P<uname>.+?)\s+(?:(?P<rent>{money})\s+)?"
        rf"(?:(?P<dep>{money})\s+)?"
        rf"(?:(?P<sqft>\d{{1,3}}(?:,\d{{3}})*)\s+)?"
        rf"(?:(?P<beds>\d+)\s+)?"
        rf"(?:(?P<baths>\d+(?:\.\d{{2}})*)\s+)?"
        rf"(?P<rev>Yes|No)\s*$"
    )

    lines = [re.sub(r"\s+", " ", ln.strip()) for ln in text.splitlines() if keep_unit_line(ln.strip())]
    units: list[dict] = []
    i = 0
    while i < len(lines):
        assembled = lines[i]
        m = header_re.match(assembled)
        used = 0
        if not m:
            for k in range(1, 4):
                if i + k >= len(lines):
                    break
                if re.search(r"\b(Yes|No)$", lines[i + k]):
                    break
                cand = assembled + " " + lines[i + k]
                m2 = header_re.match(cand)
                if m2:
                    m, used, assembled = m2, k, cand
                    break
        if not m:
            i += 1
            continue
        i += used + 1
        desc_parts: list[str] = []
        while i < len(lines) and not re.search(r"\b(Yes|No)$", lines[i]):
            if header_re.match(lines[i]):
                break
            # description / tags noise between header and data
            if not lines[i].startswith("Unit Directory"):
                desc_parts.append(lines[i])
            i += 1
        if i >= len(lines) or not re.search(r"\b(Yes|No)$", lines[i]):
            continue
        dline = lines[i]
        street, city = split_street_city(m.group("body"))
        if len(street) < 3 or street.isdigit():
            street = m.group("label").strip()

        def num(x: str | None) -> float | None:
            return float(x.replace(",", "")) if x else None

        def inti(x: str | None) -> int | None:
            return int(x.replace(",", "")) if x else None

        # Trailing description after Yes/No on following lines until next header
        i += 1
        while i < len(lines):
            if header_re.match(lines[i]):
                break
            # peek multi-line header
            peek_ok = False
            for k in range(0, 3):
                if i + k >= len(lines):
                    break
                cand = " ".join(lines[i : i + k + 1])
                if header_re.match(cand):
                    peek_ok = True
                    break
            if peek_ok:
                break
            if re.search(r"\b(Yes|No)$", lines[i]):
                break
            desc_parts.append(lines[i])
            i += 1

        description = re.sub(r"\s+", " ", " ".join(desc_parts)).strip() or None
        # Strip obvious header junk from description
        if description and (
            description.startswith("Deposit Sqft")
            or len(description) < 8
            or description in ("Yes", "No")
        ):
            description = None

        dm = data_re.match(dline)
        if dm:
            market_rent = num(dm.group("rent"))
            rec = {
                "label": m.group("label").strip(),
                "addressLine1": street,
                "city": city,
                "state": m.group("st"),
                "zip": m.group("zip"),
                "unitName": dm.group("uname").strip(),
                "marketRent": market_rent,
                "deposit": num(dm.group("dep")),
                "sqft": inti(dm.group("sqft")),
                "beds": inti(dm.group("beds")),
                "baths": float(dm.group("baths")) if dm.group("baths") else None,
                "revenue": dm.group("rev") == "Yes",
                "extras": {
                    "revenue": dm.group("rev") == "Yes",
                    "marketRent": market_rent,
                    "description": description,
                },
            }
        else:
            dm2 = re.match(r"^(?P<uname>.+?)\s+(?P<rev>Yes|No)$", dline)
            rev = (dm2.group("rev") == "Yes") if dm2 else True
            rec = {
                "label": m.group("label").strip(),
                "addressLine1": street,
                "city": city,
                "state": m.group("st"),
                "zip": m.group("zip"),
                "unitName": dm2.group("uname").strip() if dm2 else m.group("label").strip(),
                "marketRent": None,
                "deposit": None,
                "sqft": None,
                "beds": None,
                "baths": None,
                "revenue": rev,
                "extras": {
                    "revenue": rev,
                    "marketRent": None,
                    "description": description,
                },
            }
        # Drop null extras
        rec["extras"] = {k: v for k, v in rec["extras"].items() if v is not None}
        units.append(rec)
    return units


def fix_split_dates(s: str) -> str:
    return re.sub(r"(\d{2}/\d{2})\s*/\s*(\d{4})", r"\1/\2", s)


def parse_tenants(text: str) -> list[dict]:
    raw = fix_split_dates(re.sub(r"[ \t]+", " ", text))
    email_re = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
    phone_re = re.compile(
        r"(?:Mobile|Phone|Home):\s*\((\d{3})\)\s*(\d{3})[-.]?(\d{4})", re.I
    )
    date_re = re.compile(r"(\d{2}/\d{2}/\d{4})")
    money_re = re.compile(r"(\d{1,3}(?:,\d{3})*\.\d{2})")

    tenants: list[dict] = []
    for m in re.finditer(
        r"\b(Current|Past|Evict|Future)\b\s+"
        r"(Financially\s+Responsible|Co-signer|Other\s+Occupant|Guarantor)",
        raw,
    ):
        status = m.group(1)
        ttype = re.sub(r"\s+", " ", m.group(2))
        start = max(0, m.start() - 450)
        end = min(len(raw), m.end() + 380)
        window = re.sub(r"\s+", " ", raw[start:end])
        nm = re.search(
            r"([A-Z][A-Za-z'’\-]+(?:\s+[A-Z]\.)?),\s+"
            r"([A-Za-z'’\-]+(?:\s+[A-Z]\.)?(?:\s+[A-Za-z'’\-]+)*)\s+" + status,
            window,
        )
        if not nm:
            continue
        last, first = nm.group(1).strip(), nm.group(2).strip()
        after = window[window.find(last) :]
        emails = email_re.findall(after[:300])
        phones = [f"({a}) {b}-{c}" for a, b, c in phone_re.findall(after[:300])]
        dates = date_re.findall(after[:360])
        moneys = [float(x.replace(",", "")) for x in money_re.findall(after[:360])]

        before = window[: window.find(last)]
        label = None
        dbl = re.search(
            r"([0-9][A-Za-z0-9 #.'/-]{2,60}?)\s+-\s+\1\s+[^,]*,\s*PA\s+\d{5}",
            before,
        )
        if dbl:
            label = dbl.group(1).strip()
        else:
            am = None
            for cand in re.finditer(r"([0-9][A-Za-z0-9 #.'/-]{2,70}?),\s*PA\s+(\d{5})", before):
                am = cand
            if am:
                chunk = am.group(1).strip()
                chunk = re.sub(r"^(Tags|Tenant|Deposit|Rent)\s+", "", chunk)
                label = chunk

        tenants.append(
            {
                "name": f"{first} {last}".replace("  ", " ").strip(),
                "last": last,
                "first": first,
                "status": status,
                "tenantType": ttype,
                "email": emails[0].lower() if emails else None,
                "phone": phones[0] if phones else None,
                "moveIn": dates[0] if dates else None,
                "leaseTo": dates[1] if len(dates) > 1 else None,
                "rent": moneys[0] if moneys else None,
                "deposit": moneys[1] if len(moneys) > 1 else None,
                "unitLabel": label,
                "extras": {
                    "tenantType": ttype,
                    "appfolioStatus": status,
                },
            }
        )

    best: dict[str, dict] = {}
    for t in tenants:
        key = (t["email"] or t["name"].lower()) + "|" + (t["unitLabel"] or "")
        prev = best.get(key)
        rank = (
            (t["status"] == "Current") * 4
            + (t["tenantType"] == "Financially Responsible") * 2
            + bool(t["email"])
        )
        if not prev:
            best[key] = {**t, "_rank": rank}
        else:
            if rank > prev["_rank"]:
                best[key] = {**t, "_rank": rank}
    out = []
    for t in best.values():
        t.pop("_rank", None)
        out.append(t)
    out.sort(key=lambda x: (x.get("unitLabel") or "", x["name"]))
    return out


def parse_owners(text: str) -> list[dict]:
    collapsed = re.sub(r"\s+", " ", text)
    owners: dict[str, dict] = {}
    for m in re.finditer(
        r"(Bill\s+Schneider|Sadago\s+Portfolio\s+1\s+LLC|Pittsburgh\s+Portfolio\s+2\s+LLC|"
        r"142-144\s+Comrie\s+LLC|HeyDay\s+Development\s+LLC|Reasonable\s+Renting|"
        r"Orange\s+Juice\s+Properties|Frontier\s+Residential\s+LLC\s*\**|"
        r"Rell\s+Hotel\s+Management\s+LLC|Kyle\s+Franson|Ruika\s+Lin|"
        r"[A-Z][A-Za-z0-9 &.'-]{2,40}\s+LLC\s*\**)\s*-\s*"
        r"(?:Mobile|Phone|mobile|phone):\s*\((\d{3})\)\s*(\d{3})[-.]?(\d{4})",
        collapsed,
        re.I,
    ):
        name = re.sub(r"\s+", " ", m.group(1)).strip(" *")
        phone = f"({m.group(2)}) {m.group(3)}-{m.group(4)}"
        owners[name] = {"name": name, "phone": phone, "email": None}
    if "Bill Schneider" not in owners:
        owners["Bill Schneider"] = {
            "name": "Bill Schneider",
            "phone": "(412) 841-8478",
            "email": None,
        }
    return list(owners.values())


def parse_properties(text: str) -> list[dict]:
    """
    Property Directory: label + address + market rent/units/sqft + fee% + waive +
    reserve + tax year end + owner + optional description.
    PDF wrapping is messy; best-effort regex on collapsed text.
    """
    collapsed = re.sub(r"\s+", " ", text)
    # Strip repeating headers
    collapsed = re.sub(
        r"Property Directory Created on \d{2}/\d{2}/\d{4} Page \d+ ",
        " ",
        collapsed,
    )
    collapsed = re.sub(
        r"Property Market Rent Units Sqft Management Flat Fee Management Fee Percent "
        r"Minimum Fee Maximum Fee Waive Fees When Vacant Reserve Home Warranty Expiration "
        r"Insurance Expiration Tax Year End Owner\(s\) - Phone Numbers Description ",
        " ",
        collapsed,
    )

    money = r"\d{1,3}(?:,\d{3})*(?:\.\d{2})?"
    # Pattern after address block: rent units sqft fee% min max waive reserve taxYear owner - phone
    row_re = re.compile(
        rf"(?P<label>[0-9][A-Za-z0-9 #.'/-]{{1,70}}?)\s+-\s+"
        rf"(?P<body>.{{5,120}}?),\s*(?P<st>[A-Z]{{2}})\s+(?P<zip>\d{{5}})\s+"
        rf"(?P<rent>{money})\s+(?P<units>\d+)\s+(?P<sqft>\d{{1,3}}(?:,\d{{3}})*)\s+"
        rf"(?P<feePct>\d+(?:\.\d+)?)%\s+(?P<minFee>{money})\s+"
        rf"(?P<waive>Yes|No)\s+(?P<reserve>{money})\s+(?P<taxYear>\d{{1,2}})\s+"
        rf"(?P<owner>.{{2,60}}?)\s*-\s*(?:Mobile|Phone|mobile|phone):\s*"
        rf"\((?P<a>\d{{3}})\)\s*(?P<b>\d{{3}})[-.]?(?P<c>\d{{4}})",
        re.I,
    )

    props: list[dict] = []
    seen: set[str] = set()
    for m in row_re.finditer(collapsed):
        label = m.group("label").strip()
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        street, city = split_street_city(m.group("body"))
        if len(street) < 3 or street.isdigit():
            street = label
        owner = re.sub(r"\s+", " ", m.group("owner")).strip(" *")
        # scrub fee leftovers from owner
        owner = re.sub(r"^(Yes|No|\d+\.?\d*%?|\d+)\s+", "", owner)
        owner = re.sub(r"^\d+\.00\s+12\s+", "", owner)
        phone = f"({m.group('a')}) {m.group('b')}-{m.group('c')}"

        def num(x: str) -> float:
            return float(x.replace(",", ""))

        fee_pct = float(m.group("feePct"))
        extras = {
            "managementFeePercent": fee_pct,
            "minFee": num(m.group("minFee")),
            "waiveFeesWhenVacant": m.group("waive") == "Yes",
            "reserve": num(m.group("reserve")),
            "taxYearEnd": int(m.group("taxYear")),
            "ownerName": owner,
            "ownerPhone": phone,
            "unitCount": int(m.group("units")),
        }
        # Look ahead for a short description until next property-like token
        end = m.end()
        nxt = collapsed[end : end + 280]
        # stop at next "N Something - N" address pattern
        stop = re.search(
            r"\d+[A-Za-z0-9 #.'/-]{1,40}\s+-\s+\d+",
            nxt,
        )
        chunk = nxt[: stop.start()] if stop else nxt
        # Description if it has letters and isn't just fee noise
        desc = chunk.strip()
        desc = re.sub(
            r"^(Mobile|Phone):\s*\(\d{3}\)\s*\d{3}[-.]?\d{4}\s*",
            "",
            desc,
            flags=re.I,
        )
        if (
            desc
            and re.search(r"[A-Za-z]{4,}", desc)
            and "Management Fee" not in desc
            and len(desc) > 20
        ):
            # trim trailing next-header fragments
            desc = re.split(r"\d{1,5}\s+[A-Z]", desc)[0].strip()
            if len(desc) > 20:
                extras["description"] = desc[:800]

        props.append(
            {
                "label": label,
                "addressLine1": street,
                "city": city,
                "state": m.group("st"),
                "zip": m.group("zip"),
                "marketRent": num(m.group("rent")),
                "sqft": int(m.group("sqft").replace(",", "")),
                "ownerName": owner,
                "ownerPhone": phone,
                "extras": extras,
            }
        )
    return props


def main() -> None:
    unit_txt = (STAGING / "unit_directory-20260717.txt").read_text()
    tenant_txt = (STAGING / "tenant_directory-20260717.txt").read_text()
    prop_txt = (STAGING / "property_directory-20260717.txt").read_text()

    units = parse_units(unit_txt)
    tenants = parse_tenants(tenant_txt)
    owners = parse_owners(prop_txt)
    properties = parse_properties(prop_txt)

    (STAGING / "parsed-units.json").write_text(json.dumps(units, indent=2))
    (STAGING / "parsed-tenants.json").write_text(json.dumps(tenants, indent=2))
    (STAGING / "parsed-owners.json").write_text(json.dumps(owners, indent=2))
    (STAGING / "parsed-properties.json").write_text(json.dumps(properties, indent=2))

    print(f"units: {len(units)} (with rent {sum(1 for u in units if u.get('marketRent'))})")
    print(
        f"tenants: {len(tenants)} "
        f"(current FR {sum(1 for t in tenants if t['status']=='Current' and t['tenantType']=='Financially Responsible')})"
    )
    print(f"owners: {len(owners)}")
    print(
        f"properties: {len(properties)} "
        f"(with fee% {sum(1 for p in properties if p.get('extras', {}).get('managementFeePercent') is not None)})"
    )
    print("cities", Counter(u["city"] for u in units).most_common(8))


if __name__ == "__main__":
    main()
