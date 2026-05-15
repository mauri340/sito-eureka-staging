"""Generate static HTML versions of WordPress blog posts for AI crawler accessibility.

WHY: apprendimentorapido.it/blog.html loads posts via JS fetch from wp-json.
AI crawlers (GPTBot, ClaudeBot, PerplexityBot) don't execute JavaScript,
so all blog posts are invisible to them. This script generates static HTML
copies in /blog/<slug>.html that AI bots can read directly.

The canonical points back to the WordPress URL so Google treats WP as
the source of truth (no duplicate content issue).

USAGE:
    python scripts/generate_static_blog.py
    python scripts/generate_static_blog.py --dry-run   # show what would be done

OUTPUT:
    blog/<slug>.html              one file per post
    blog/index.html               static list of all posts (overwrites JS-only version
                                  with a hybrid: static list + JS enhancement)

Idempotent: if a post hasn't changed (modified date), the file is NOT rewritten.
Deleted posts: files for posts no longer in WP are removed from blog/.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

WP_API = "https://apprendimentorapido.it/wp-json/wp/v2/posts"
SITE_BASE = "https://apprendimentorapido.it"
REPO_ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = REPO_ROOT / "blog"
SITEMAP_PATH = REPO_ROOT / "sitemap.xml"
DEFAULT_AUTHOR = "Maurizio Possenti"
DEFAULT_AUTHOR_URL = "https://apprendimentorapido.it/chi-siamo"

# Pagine fisse del sito (priorità + changefreq)
STATIC_PAGES = [
    ("/",                         "weekly",  "1.0"),
    ("/master-eureka.html",       "monthly", "0.9"),
    ("/tecniche-memoria.html",    "monthly", "0.8"),
    ("/lettura-veloce.html",      "monthly", "0.8"),
    ("/mappe-mentali.html",       "monthly", "0.8"),
    ("/libro.html",               "monthly", "0.8"),
    ("/testimonianze.html",       "monthly", "0.7"),
    ("/coaching.html",            "monthly", "0.7"),
    ("/demo-zoom/",               "weekly",  "0.7"),
    ("/blog/",                    "weekly",  "0.6"),
]


def fetch_all_posts() -> list[dict[str, Any]]:
    posts: list[dict[str, Any]] = []
    page = 1
    while True:
        r = requests.get(
            WP_API,
            params={
                "per_page": 100,
                "page": page,
                "_embed": "author,wp:featuredmedia,wp:term",
                "_fields": "id,slug,link,title,date,modified,content,excerpt,author,featured_media,_links,_embedded",
            },
            timeout=30,
        )
        if r.status_code == 400 and page > 1:
            break
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        posts.extend(batch)
        if len(batch) < 100:
            break
        page += 1
        time.sleep(0.5)
    return posts


def get_author_name(post: dict[str, Any]) -> str:
    emb = post.get("_embedded") or {}
    authors = emb.get("author") or []
    for a in authors:
        n = (a.get("name") or "").strip()
        if n:
            return n
    return DEFAULT_AUTHOR


def get_featured_image(post: dict[str, Any]) -> str | None:
    emb = post.get("_embedded") or {}
    fm = emb.get("wp:featuredmedia") or []
    for m in fm:
        url = m.get("source_url")
        if url:
            return url
    return None


def get_categories(post: dict[str, Any]) -> list[str]:
    emb = post.get("_embedded") or {}
    terms = emb.get("wp:term") or []
    out = []
    for group in terms:
        for t in group:
            name = (t.get("name") or "").strip()
            if name:
                out.append(name)
    return out


def strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()


def clean_excerpt(excerpt_html: str) -> str:
    txt = strip_tags(excerpt_html)
    txt = html.unescape(txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    if len(txt) > 200:
        txt = txt[:197] + "..."
    return txt


def sanitize_content_html(content_html: str) -> str:
    """Remove script/style/iframe to avoid injection or layout shifts.

    Keep typical post HTML (p, h2-h4, ul, ol, li, strong, em, a, img, blockquote, code, pre, table, figure).
    """
    sanitized = re.sub(r"<script[^>]*>.*?</script>", "", content_html or "", flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"<style[^>]*>.*?</style>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r"<iframe[^>]*>.*?</iframe>", "", sanitized, flags=re.IGNORECASE | re.DOTALL)
    return sanitized


HEAD_COMMON = """<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2X3V7JZPBJ"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-2X3V7JZPBJ');</script>
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','957273196609597');fbq('track','PageView');</script>
<link rel="stylesheet" href="/components/nav.css">"""


ARTICLE_CSS = """<style>
:root{--navy:#0D1B2A;--navy2:#1C2B3A;--teal:#00A988;--teal-dk:#007a63;--gold:#B8973E;--off-white:#F8F7F4;--light:#F0EFEB;--text:#1a1a2e;--muted:#5a6a7a;--muted-lt:#8a9aaa;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{font-family:'Inter',sans-serif;background:var(--off-white);color:var(--text);line-height:1.75;}
.container{max-width:780px;margin:0 auto;padding:0 28px;}
.article-hero{padding:80px 0 40px;background:#fff;border-bottom:1px solid var(--light);}
.crumb{font-size:13px;color:var(--muted);margin-bottom:18px;}
.crumb a{color:var(--teal-dk);text-decoration:none;}
.crumb a:hover{text-decoration:underline;}
.article-title{font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;line-height:1.2;color:var(--navy);margin-bottom:18px;}
.article-meta{font-size:14px;color:var(--muted);margin-bottom:8px;}
.article-meta strong{color:var(--text);font-weight:600;}
.article-tags{margin-top:12px;}
.tag{display:inline-block;padding:4px 12px;border-radius:50px;font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;background:rgba(0,169,136,.12);color:var(--teal-dk);margin-right:6px;}
.article-image{margin:30px 0 20px;border-radius:14px;overflow:hidden;}
.article-image img{display:block;width:100%;height:auto;}
.article-body{padding:40px 0 80px;}
.article-body p{margin-bottom:1.2em;font-size:17px;}
.article-body h2{font-family:'Playfair Display',serif;font-size:1.7rem;color:var(--navy);margin:48px 0 18px;line-height:1.3;}
.article-body h3{font-size:1.3rem;color:var(--navy);margin:32px 0 14px;line-height:1.4;}
.article-body h4{font-size:1.1rem;color:var(--navy);margin:24px 0 10px;}
.article-body a{color:var(--teal-dk);}
.article-body img{max-width:100%;height:auto;border-radius:10px;margin:20px 0;}
.article-body blockquote{border-left:4px solid var(--gold);padding:8px 0 8px 20px;margin:24px 0;color:var(--muted);font-style:italic;}
.article-body ul,.article-body ol{margin:0 0 1.2em 1.4em;}
.article-body li{margin-bottom:.4em;font-size:17px;}
.article-body code{background:var(--light);padding:2px 6px;border-radius:4px;font-size:14px;}
.article-body pre{background:var(--navy);color:#fff;padding:18px;border-radius:8px;overflow-x:auto;margin:20px 0;}
.cta-box{margin:60px 0 0;padding:30px;background:#fff;border:1px solid var(--light);border-radius:14px;}
.cta-box h3{font-family:'Playfair Display',serif;color:var(--navy);margin-bottom:10px;}
.cta-box p{color:var(--muted);margin-bottom:18px;}
.cta-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;background:var(--navy);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;}
.cta-btn:hover{background:var(--navy2);}
@media(max-width:600px){.article-hero{padding:60px 0 30px;}.article-body{padding:30px 0 60px;}}
</style>"""


def render_post_html(post: dict[str, Any]) -> str:
    title_text = strip_tags(post["title"]["rendered"]).strip()
    title_text = html.unescape(title_text)
    slug = post["slug"]
    wp_link = post["link"]
    pub_date = post["date"]
    mod_date = post.get("modified") or pub_date
    excerpt = clean_excerpt(post.get("excerpt", {}).get("rendered", ""))
    content_html = sanitize_content_html(post.get("content", {}).get("rendered", ""))
    author = get_author_name(post)
    featured = get_featured_image(post)
    categories = get_categories(post)

    pub_iso = pub_date if "T" in pub_date else pub_date.replace(" ", "T")
    mod_iso = mod_date if "T" in mod_date else mod_date.replace(" ", "T")

    try:
        pub_human = datetime.fromisoformat(pub_iso).strftime("%d %B %Y")
    except Exception:
        pub_human = pub_iso[:10]

    schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title_text,
        "description": excerpt or title_text,
        "datePublished": pub_iso,
        "dateModified": mod_iso,
        "author": {
            "@type": "Person",
            "name": author,
            "url": DEFAULT_AUTHOR_URL,
        },
        "publisher": {
            "@type": "Organization",
            "name": "Metodo Eureka — Apprendimento Rapido",
            "logo": {
                "@type": "ImageObject",
                "url": f"{SITE_BASE}/images/logo.png",
            },
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": wp_link,
        },
        "inLanguage": "it-IT",
    }
    if featured:
        schema["image"] = featured
    if categories:
        schema["keywords"] = ", ".join(categories[:6])

    tags_html = "".join(f'<span class="tag">{html.escape(c)}</span>' for c in categories[:4])
    image_block = (
        f'<div class="article-image"><img src="{html.escape(featured)}" alt="{html.escape(title_text)}" loading="lazy"></div>'
        if featured
        else ""
    )

    og_image = featured or f"{SITE_BASE}/images/og-image.png"
    desc_safe = html.escape(excerpt or title_text)
    title_safe = html.escape(title_text)

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
{HEAD_COMMON}
<title>{title_safe} | Metodo Eureka</title>
<meta name="description" content="{desc_safe}">
<link rel="canonical" href="{html.escape(wp_link)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="it_IT">
<meta property="og:site_name" content="Metodo Eureka — Apprendimento Rapido">
<meta property="og:title" content="{title_safe}">
<meta property="og:description" content="{desc_safe}">
<meta property="og:url" content="{SITE_BASE}/blog/{slug}.html">
<meta property="og:image" content="{html.escape(og_image)}">
<meta property="article:published_time" content="{pub_iso}">
<meta property="article:modified_time" content="{mod_iso}">
<meta property="article:author" content="{html.escape(author)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title_safe}">
<meta name="twitter:description" content="{desc_safe}">
<meta name="twitter:image" content="{html.escape(og_image)}">
<script type="application/ld+json">
{json.dumps(schema, ensure_ascii=False, indent=2)}
</script>
{ARTICLE_CSS}
</head>
<body>
<div id="site-nav"></div>
<script src="/components/nav-loader.js"></script>

<article>
<header class="article-hero">
  <div class="container">
    <div class="crumb"><a href="/">Home</a> &raquo; <a href="/blog.html">Blog</a> &raquo; {title_safe}</div>
    <h1 class="article-title">{title_safe}</h1>
    <p class="article-meta">di <strong>{html.escape(author)}</strong> &middot; <time datetime="{pub_iso}">{pub_human}</time></p>
    {f'<div class="article-tags">{tags_html}</div>' if tags_html else ''}
    {image_block}
  </div>
</header>

<div class="article-body">
  <div class="container">
    {content_html}

    <div class="cta-box">
      <h3>Vuoi imparare il Metodo Eureka?</h3>
      <p>Iscriviti al webinar gratuito di 2 ore per scoprire come funziona il metodo che ha gia' formato oltre 40.000 professionisti.</p>
      <a href="/demo-zoom/" class="cta-btn">Iscriviti al webinar gratuito &raquo;</a>
    </div>
  </div>
</div>
</article>

<div id="site-footer"></div>
<script src="/components/footer-loader.js"></script>
</body>
</html>
"""


def render_index_html(posts: list[dict[str, Any]]) -> str:
    posts_sorted = sorted(posts, key=lambda p: p.get("date", ""), reverse=True)
    cards = []
    for p in posts_sorted:
        title_text = html.unescape(strip_tags(p["title"]["rendered"]).strip())
        slug = p["slug"]
        excerpt = clean_excerpt(p.get("excerpt", {}).get("rendered", ""))
        pub_iso = p["date"] if "T" in p["date"] else p["date"].replace(" ", "T")
        try:
            pub_human = datetime.fromisoformat(pub_iso).strftime("%d %B %Y")
        except Exception:
            pub_human = pub_iso[:10]
        featured = get_featured_image(p)
        img_block = (
            f'<div class="post-card-img"><img src="{html.escape(featured)}" alt="{html.escape(title_text)}" loading="lazy"></div>'
            if featured
            else ""
        )
        cards.append(
            f"""<article class="post-card">
{img_block}
<div class="post-card-body">
  <p class="post-card-meta"><time datetime="{pub_iso}">{pub_human}</time></p>
  <h2 class="post-card-title"><a href="/blog/{slug}.html">{html.escape(title_text)}</a></h2>
  <p class="post-card-excerpt">{html.escape(excerpt)}</p>
  <a class="post-card-link" href="/blog/{slug}.html">Leggi l'articolo &raquo;</a>
</div>
</article>"""
        )

    cards_html = "\n".join(cards)
    total = len(posts_sorted)
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
{HEAD_COMMON}
<title>Blog | Memoria, Lettura Veloce e Produttivita' &mdash; Metodo Eureka</title>
<meta name="description" content="Articoli pratici su memoria, lettura veloce e produttivita' professionale firmati da Maurizio Possenti. {total} articoli, 25 anni di esperienza, 40.000 professionisti formati.">
<link rel="canonical" href="{SITE_BASE}/blog/">
<meta property="og:type" content="website">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="Blog Metodo Eureka">
<meta property="og:description" content="Articoli pratici su memoria, lettura veloce e produttivita'.">
<meta property="og:url" content="{SITE_BASE}/blog/">
<meta property="og:image" content="{SITE_BASE}/images/og-image.png">
<style>
:root{{--navy:#0D1B2A;--navy2:#1C2B3A;--teal:#00A988;--teal-dk:#007a63;--gold:#B8973E;--off-white:#F8F7F4;--light:#F0EFEB;--light2:#E8E7E2;--text:#1a1a2e;--muted:#5a6a7a;}}
*,*::before,*::after{{margin:0;padding:0;box-sizing:border-box;}}
body{{font-family:'Inter',sans-serif;background:var(--off-white);color:var(--text);line-height:1.65;}}
.container{{max-width:1100px;margin:0 auto;padding:0 28px;}}
.blog-hero{{padding:80px 0 30px;text-align:center;}}
.blog-hero h1{{font-family:'Playfair Display',serif;font-size:clamp(2.2rem,4vw,3.2rem);color:var(--navy);margin-bottom:14px;}}
.blog-hero p{{color:var(--muted);max-width:560px;margin:0 auto;}}
.blog-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:28px;padding:40px 0 80px;}}
.post-card{{background:#fff;border:1px solid var(--light2);border-radius:14px;overflow:hidden;transition:transform .2s,box-shadow .2s;}}
.post-card:hover{{transform:translateY(-4px);box-shadow:0 8px 24px rgba(13,27,42,.08);}}
.post-card-img img{{display:block;width:100%;height:200px;object-fit:cover;}}
.post-card-body{{padding:22px;}}
.post-card-meta{{font-size:13px;color:var(--muted);margin-bottom:8px;}}
.post-card-title{{font-family:'Playfair Display',serif;font-size:1.25rem;line-height:1.35;margin-bottom:10px;}}
.post-card-title a{{color:var(--navy);text-decoration:none;}}
.post-card-title a:hover{{color:var(--teal-dk);}}
.post-card-excerpt{{font-size:14.5px;color:var(--muted);margin-bottom:12px;line-height:1.6;}}
.post-card-link{{color:var(--teal-dk);font-size:14px;font-weight:600;text-decoration:none;}}
.post-card-link:hover{{text-decoration:underline;}}
</style>
</head>
<body>
<div id="site-nav"></div>
<script src="/components/nav-loader.js"></script>

<section class="blog-hero">
  <div class="container">
    <h1>Articoli su memoria, lettura veloce e produttivita'</h1>
    <p>Firmati da Maurizio Possenti, formatore italiano di apprendimento accelerato dal 2001. {total} articoli pubblicati.</p>
  </div>
</section>

<section class="container">
  <div class="blog-grid">
{cards_html}
  </div>
</section>

<div id="site-footer"></div>
<script src="/components/footer-loader.js"></script>
</body>
</html>
"""


def render_sitemap_xml(posts: list[dict[str, Any]]) -> str:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    # Pagine fisse
    for path, freq, prio in STATIC_PAGES:
        lines.append("  <url>")
        lines.append(f"    <loc>{SITE_BASE}{path}</loc>")
        lines.append(f"    <lastmod>{today}</lastmod>")
        lines.append(f"    <changefreq>{freq}</changefreq>")
        lines.append(f"    <priority>{prio}</priority>")
        lines.append("  </url>")
    # Articoli blog (ordinati dal più recente)
    posts_sorted = sorted(posts, key=lambda p: p.get("modified", p.get("date", "")), reverse=True)
    for p in posts_sorted:
        slug = p["slug"]
        mod = p.get("modified") or p.get("date", today)
        mod_date = mod.split("T")[0] if "T" in mod else mod[:10]
        lines.append("  <url>")
        lines.append(f"    <loc>{SITE_BASE}/blog/{slug}.html</loc>")
        lines.append(f"    <lastmod>{mod_date}</lastmod>")
        lines.append("    <changefreq>monthly</changefreq>")
        lines.append("    <priority>0.6</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def main(dry_run: bool) -> int:
    print(f"[generate_static_blog] Fetching posts from {WP_API}")
    posts = fetch_all_posts()
    print(f"[generate_static_blog] Got {len(posts)} posts")
    if not posts:
        print("ERROR: no posts returned. Abort.")
        return 2

    BLOG_DIR.mkdir(parents=True, exist_ok=True)

    wanted_files = {"index.html"}
    written = 0
    skipped = 0
    deleted = 0

    for p in posts:
        slug = p["slug"]
        fname = f"{slug}.html"
        wanted_files.add(fname)
        out_path = BLOG_DIR / fname
        new_html = render_post_html(p)
        if out_path.exists():
            old = out_path.read_text(encoding="utf-8")
            if old == new_html:
                skipped += 1
                continue
        if dry_run:
            print(f"  [DRY] would write blog/{fname} ({len(new_html)} bytes)")
        else:
            out_path.write_text(new_html, encoding="utf-8")
            print(f"  wrote blog/{fname}")
        written += 1

    index_html = render_index_html(posts)
    index_path = BLOG_DIR / "index.html"
    if index_path.exists() and index_path.read_text(encoding="utf-8") == index_html:
        pass
    elif dry_run:
        print(f"  [DRY] would write blog/index.html ({len(index_html)} bytes)")
    else:
        index_path.write_text(index_html, encoding="utf-8")
        print("  wrote blog/index.html")

    # Cleanup files for posts no longer in WP
    for existing in BLOG_DIR.iterdir():
        if existing.name not in wanted_files and existing.suffix == ".html":
            if dry_run:
                print(f"  [DRY] would delete blog/{existing.name}")
            else:
                existing.unlink()
                print(f"  deleted blog/{existing.name}")
            deleted += 1

    # Sitemap auto-aggiornata
    sitemap_xml = render_sitemap_xml(posts)
    sitemap_changed = False
    if SITEMAP_PATH.exists() and SITEMAP_PATH.read_text(encoding="utf-8") == sitemap_xml:
        pass
    else:
        sitemap_changed = True
        if dry_run:
            print(f"  [DRY] would write sitemap.xml ({len(sitemap_xml)} bytes, {len(STATIC_PAGES)} static + {len(posts)} posts)")
        else:
            SITEMAP_PATH.write_text(sitemap_xml, encoding="utf-8")
            print(f"  wrote sitemap.xml ({len(STATIC_PAGES)} static + {len(posts)} posts)")

    print(
        f"[generate_static_blog] Done. written={written} skipped={skipped} deleted={deleted} sitemap_changed={sitemap_changed}"
    )
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    sys.exit(main(args.dry_run))
