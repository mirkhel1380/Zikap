CREATE TABLE IF NOT EXISTS service_catalog (
 id TEXT PRIMARY KEY CHECK(id IN ('audit','keywords','onpage','bundle')),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 price_usd INTEGER NOT NULL CHECK(price_usd BETWEEN 1 AND 9999),
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL
);
INSERT OR IGNORE INTO service_catalog VALUES
 ('audit','Technical SEO Starter','Prioritized technical findings and an action checklist for up to 5 public pages.',29,1,'2026-11-07T00:00:00Z'),
 ('keywords','Keyword Research Starter','25 curated keyword ideas, intent groups and a map for up to 5 pages.',19,1,'2026-11-07T00:00:00Z'),
 ('onpage','On-page SEO Starter','Proposed titles, descriptions, headings and internal links for up to 3 existing pages.',39,1,'2026-11-07T00:00:00Z'),
 ('bundle','SEO Starter Bundle','A 5-page technical review, 25-keyword map and edit briefs for 3 existing pages.',79,1,'2026-11-07T00:00:00Z');
CREATE TABLE IF NOT EXISTS order_package_snapshots (
 order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 price_usd INTEGER NOT NULL,
 catalog_version INTEGER NOT NULL
);
