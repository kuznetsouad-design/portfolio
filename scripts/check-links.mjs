import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const siteOrigin = "https://kuznetsovad.site";
const allowedExternalProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const errors = [];

const caseRoutes = new Set([
  "/vaiti/",
  "/goora/",
  "/employee-profile/",
  "/en/vaiti/",
  "/en/goora/",
  "/en/employee-profile/",
]);

const expectedNextCase = new Map([
  ["/vaiti/", "/goora/"],
  ["/goora/", "/employee-profile/"],
  ["/employee-profile/", "/vaiti/"],
  ["/en/vaiti/", "/en/goora/"],
  ["/en/goora/", "/en/employee-profile/"],
  ["/en/employee-profile/", "/en/vaiti/"],
]);

const expectedLanguageTargets = new Map([
  ["/", { ru: "/", en: "/en/" }],
  ["/en/", { ru: "/", en: "/en/" }],
  ["/vaiti/", { ru: "/vaiti/", en: "/en/vaiti/" }],
  ["/goora/", { ru: "/goora/", en: "/en/goora/" }],
  ["/employee-profile/", { ru: "/employee-profile/", en: "/en/employee-profile/" }],
  ["/en/vaiti/", { ru: "/vaiti/", en: "/en/vaiti/" }],
  ["/en/goora/", { ru: "/goora/", en: "/en/goora/" }],
  ["/en/employee-profile/", { ru: "/employee-profile/", en: "/en/employee-profile/" }],
]);

const expectedHomeCards = new Map([
  ["/", ["/vaiti/", "/goora/", "/employee-profile/"]],
  ["/en/", ["/en/vaiti/", "/en/goora/", "/en/employee-profile/"]],
]);

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "test-results") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function routeForHtml(filePath) {
  const rel = toPosix(path.relative(rootDir, filePath));

  if (rel === "index.html") {
    return "/";
  }

  if (rel.endsWith("/index.html")) {
    return `/${rel.slice(0, -"index.html".length)}`;
  }

  return `/${rel}`;
}

function baseUrlForFile(filePath) {
  const rel = toPosix(path.relative(rootDir, filePath));

  return `${siteOrigin}/${rel}`;
}

function stripUrl(value) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function normalizePathname(url) {
  return decodeURIComponent(url.pathname);
}

function localFileForPathname(pathname) {
  const cleanPath = normalizePathname({ pathname });
  const withoutLeadingSlash = cleanPath.replace(/^\/+/, "");

  if (cleanPath === "/") {
    return path.join(rootDir, "index.html");
  }

  if (cleanPath.endsWith("/")) {
    return path.join(rootDir, withoutLeadingSlash, "index.html");
  }

  const directFile = path.join(rootDir, withoutLeadingSlash);

  if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
    return directFile;
  }

  const indexFile = path.join(rootDir, withoutLeadingSlash, "index.html");

  if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
    return indexFile;
  }

  return directFile;
}

function isSkippableUrl(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("#")) {
    return true;
  }

  const lower = rawUrl.toLowerCase();

  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("about:")
  );
}

function resolveUrl(rawUrl, baseUrl) {
  const cleanUrl = stripUrl(rawUrl);

  if (isSkippableUrl(cleanUrl)) {
    return null;
  }

  try {
    return new URL(cleanUrl, baseUrl);
  } catch {
    errors.push(`Invalid URL "${rawUrl}" from ${baseUrl}`);
    return null;
  }
}

function assertInternalUrl(rawUrl, baseUrl, source, kind) {
  const url = resolveUrl(rawUrl, baseUrl);

  if (!url) {
    return null;
  }

  if (allowedExternalProtocols.has(url.protocol) && url.origin !== siteOrigin) {
    return url;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    errors.push(`${source}: unsupported ${kind} protocol "${url.protocol}" in "${rawUrl}"`);
    return url;
  }

  if (url.origin !== siteOrigin) {
    return url;
  }

  const pathname = normalizePathname(url);

  if (pathname.includes("/en/en/")) {
    errors.push(`${source}: duplicated locale segment in ${kind} "${rawUrl}"`);
  }

  if (/\/(?:vaiti|goora|employee-profile)\/assets\//.test(pathname)) {
    errors.push(`${source}: nested asset path in ${kind} "${rawUrl}"`);
  }

  const targetFile = localFileForPathname(pathname);

  if (!fs.existsSync(targetFile)) {
    errors.push(`${source}: missing ${kind} target "${rawUrl}" -> ${pathname}`);
    return url;
  }

  return url;
}

function attrsFromTag(tag) {
  const attrs = new Map();
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attrPattern.exec(tag))) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attrs;
}

function tags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

function hrefFromTag(tag) {
  return attrsFromTag(tag).get("href") ?? null;
}

function resolvedPath(rawUrl, baseUrl) {
  const url = resolveUrl(rawUrl, baseUrl);

  if (!url || url.origin !== siteOrigin) {
    return null;
  }

  return normalizePathname(url);
}

function splitSrcset(value) {
  return value
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function checkHtmlFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const route = routeForHtml(filePath);
  const baseUrl = `${siteOrigin}${route}`;
  const source = toPosix(path.relative(rootDir, filePath));

  if (/<base\b/i.test(html)) {
    errors.push(`${source}: contains <base>, which can rewrite relative links unexpectedly`);
  }

  for (const tag of html.match(/<[^!][^>]*>/g) ?? []) {
    const attrs = attrsFromTag(tag);

    for (const attr of ["href", "src", "poster", "data-modal-src"]) {
      const value = attrs.get(attr);

      if (value) {
        assertInternalUrl(value, baseUrl, source, attr);
      }
    }

    const srcset = attrs.get("srcset");

    if (srcset) {
      for (const value of splitSrcset(srcset)) {
        assertInternalUrl(value, baseUrl, source, "srcset");
      }
    }

    const content = attrs.get("content");

    if (content && /^https?:\/\/kuznetsovad\.site\//i.test(content)) {
      assertInternalUrl(content, baseUrl, source, "content");
    }
  }

  for (const match of html.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^)]*?))\)/g)) {
    assertInternalUrl(match[1] ?? match[2] ?? match[3], baseUrl, source, "css-url");
  }

  checkRouteContracts(html, route, baseUrl, source);
}

function checkRouteContracts(html, route, baseUrl, source) {
  const brand = tags(html, "a").find((tag) => /\bclass=["'][^"']*\bbrand\b/.test(tag));
  const expectedBrand = route.startsWith("/en/") || route === "/en/" ? "/en/" : "/";

  if (brand) {
    const actual = resolvedPath(hrefFromTag(brand), baseUrl);

    if (actual !== expectedBrand) {
      errors.push(`${source}: brand link should be "${expectedBrand}", got "${actual}"`);
    }
  }

  const expectedLanguage = expectedLanguageTargets.get(route);

  if (expectedLanguage) {
    const languageTags = tags(html, "a").filter((tag) => /\blanguage-toggle__item\b/.test(tag));
    const actualByLang = new Map();

    for (const tag of languageTags) {
      const attrs = attrsFromTag(tag);
      const lang = attrs.get("hreflang");
      const href = attrs.get("href");

      if (lang && href) {
        actualByLang.set(lang, resolvedPath(href, baseUrl));
      }
    }

    for (const [lang, expected] of Object.entries(expectedLanguage)) {
      const actual = actualByLang.get(lang);

      if (actual !== expected) {
        errors.push(`${source}: ${lang.toUpperCase()} language link should be "${expected}", got "${actual}"`);
      }
    }
  }

  const expectedCards = expectedHomeCards.get(route);

  if (expectedCards) {
    const cardHrefs = tags(html, "a")
      .filter((tag) => /\bproject-link\b/.test(tag))
      .map((tag) => resolvedPath(hrefFromTag(tag), baseUrl))
      .filter(Boolean);

    for (const expected of expectedCards) {
      if (!cardHrefs.includes(expected)) {
        errors.push(`${source}: homepage card href "${expected}" is missing`);
      }
    }
  }

  const expectedNext = expectedNextCase.get(route);

  if (expectedNext) {
    const nextTag = tags(html, "a").find((tag) => /\bcase-pagination__link\b/.test(tag));
    const actual = nextTag ? resolvedPath(hrefFromTag(nextTag), baseUrl) : null;

    if (actual !== expectedNext) {
      errors.push(`${source}: next-case link should be "${expectedNext}", got "${actual}"`);
    }

    if (actual && caseRoutes.has(route) && actual.startsWith(route) && actual !== route) {
      errors.push(`${source}: next-case link resolves under current case route: "${actual}"`);
    }
  }

  for (const tag of tags(html, "a")) {
    const href = hrefFromTag(tag);

    if (!href || !href.includes("cv-")) {
      continue;
    }

    const actual = resolvedPath(href, baseUrl);

    if (actual !== "/assets/cv-ru.pdf" && actual !== "/assets/cv-en.pdf") {
      errors.push(`${source}: CV link should point to /assets/cv-ru.pdf or /assets/cv-en.pdf, got "${actual}"`);
    }
  }
}

function checkCssFile(filePath) {
  const css = fs.readFileSync(filePath, "utf8");
  const source = toPosix(path.relative(rootDir, filePath));
  const baseUrl = baseUrlForFile(filePath);

  for (const match of css.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^)]*?))\)/g)) {
    assertInternalUrl(match[1] ?? match[2] ?? match[3], baseUrl, source, "css-url");
  }
}

function checkWebManifest(filePath) {
  const source = toPosix(path.relative(rootDir, filePath));
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));

  for (const icon of manifest.icons ?? []) {
    if (icon.src) {
      assertInternalUrl(icon.src, `${siteOrigin}/site.webmanifest`, source, "manifest-icon");
    }
  }
}

const files = walkFiles(rootDir);

for (const filePath of files) {
  if (filePath.endsWith(".html")) {
    checkHtmlFile(filePath);
  } else if (filePath.endsWith(".css")) {
    checkCssFile(filePath);
  } else if (filePath.endsWith(".webmanifest")) {
    checkWebManifest(filePath);
  }
}

if (errors.length) {
  console.error(`Link check failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Link check passed.");
