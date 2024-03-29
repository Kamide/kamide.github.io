/* eslint-disable no-undef */
'use strict';

const slideshow = /**@type {HTMLDivElement}*/(document.getElementById('slideshow'));
// we want the slideshow the be keyboard navigable
// autofocus attribute does not work if URL has hash fragment, so we need JS
slideshow.focus();

const initialHash = location.hash.substring(1);
if (initialHash) { // Firefox emits warnings if empty string is passed to document.getElementById
	document.getElementById(initialHash)?.scrollIntoView();
}

addEventListener('hashchange', () => {
	const hash = location.hash.substring(1);
	if (hash) {
		document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
	}
});

const navigation = /**@type {HTMLDivElement}*/(document.getElementById('navigation'));
navigation.addEventListener('click', (event) => {
	const anchor = event.target;
	if (anchor instanceof HTMLAnchorElement) {
		event.preventDefault();
		document.getElementById(anchor.hash.substring(1))?.scrollIntoView({ behavior: 'smooth' });

		if (anchor.hash !== location.hash) {
			history.pushState(null, '', anchor.hash);
		}
	}
});

const menuToggle = /**@type {HTMLButtonElement}*/(document.getElementById('menu'));
menuToggle.addEventListener('click', () => {
	const open = navigation.toggleAttribute('open');
	menuToggle.setAttribute('aria-expanded', String(open));
});

const themeSwitcher = /**@type {HTMLButtonElement}*/(document.getElementById('theme-switcher'));
themeSwitcher.addEventListener('click', () => {
	let nextTheme;
	switch (currentTheme) {
		case 'dark':
			nextTheme = 'light';
			break;
		case 'light':
			nextTheme = 'dark';
			break;
	}

	if (nextTheme) {
		document.documentElement.dataset.theme = nextTheme;
		themeSwitcher.ariaLabel = `switch to ${currentTheme} theme`;
		localStorage.setItem('theme', nextTheme);
		currentTheme = nextTheme;
	} else {
		// prefers-color-scheme could change during execution, but we'll just take the original
		delete document.documentElement.dataset.theme;
		themeSwitcher.ariaLabel = `switch to ${systemTheme === 'dark' ? 'light' : 'dark'} theme`;
		localStorage.removeItem('theme');
		currentTheme = systemTheme;
	}
});

const meteorRootSvg = /**@type {SVGSVGElement}*/(/**@type {unknown}*/(document.getElementById('sky')));
const meteorRootHtml = /**@type {HTMLElement}*/(meteorRootSvg.parentElement);
const meteorShower = /**@type {SVGGElement}*/(/**@type {unknown}*/(document.getElementById('meteor-shower')));
const meteorTemplate = /**@type {SVGLineElement}*/(/**@type {unknown}*/(document.getElementById('meteor-template')));
meteorTemplate.removeAttribute('id');

// #region meteor positioning
let minX = 0;
let maxX = 0;
let minY = 0;
let maxY = 0;
let minDistance = 0;
let maxDistance = 0;
let angle = 0;
// #endregion

// #region meteor appearance
let minWidth = 1;
let maxWidth = 2;
let minDuration = 1000;
let maxDuration = 2000;
// #endregion

// #region meteor animation loop
/**
 * @type {ReturnType<setTimeout> | undefined}
 */
let timer = undefined;
let minDelay = 100;
let maxDelay = 2000;
let shouldAnimate = false;
// #endregion

function createMeteor(x1 = 0, y1 = 0, x2 = 0, y2 = 0, strokeWidth = 1, duration = 1) {
	const meteor = /**@type {SVGPathElement}*/(meteorTemplate.cloneNode());
	Promise.allSettled([
		meteor.animate([
			{ d: `path('M ${x2},${y2} L ${x2},${y2}')` },
			{ d: `path('M ${(x1 + x2) / 2},${(y1 + y2) / 2} L ${x2},${y2}')` },
		], {
			duration,
			easing: 'cubic-bezier(0, 0.5, 0.3, 1)',
		}).finished,
		meteor.animate([
			{ d: `path('M ${x1},${y1} L ${x1},${y1}')` },
		], {
			duration,
			easing: 'cubic-bezier(0, 0, 0.4, 1)',
		}).finished,
		meteor.animate([
			{ strokeWidth: 0 },
			{ strokeWidth },
			{ strokeWidth },
			{ strokeWidth },
			{ strokeWidth },
			{ strokeWidth: 0 },
		], {
			duration,
			easing: 'linear',
		}).finished,
	]).then(() => meteor.remove());
	return meteor;
}

const between = (min = 0, max = 1) => Math.random() * (max - min) + min;

function renderMeteor() {
	const x1 = between(minX, maxX);
	const y1 = between(minY, maxY);
	const distance = between(minDistance, maxDistance);
	const x2 = distance * Math.cos(angle) + x1;
	const y2 = distance * Math.sin(angle) + y1;
	const width = between(minWidth, maxWidth);
	const duration = between(minDuration, maxDuration);
	meteorShower.append(createMeteor(x1, y1, x2, y2, width, duration));
}

function startMeteorShower() {
	renderMeteor();
	timer = setTimeout(startMeteorShower, between(minDelay, maxDelay));
}

function stopMeteorShower() {
	clearTimeout(timer);
	timer = undefined;
	for (const animation of meteorShower.getAnimations({ subtree: true })) {
		animation.cancel(); // trigger the promise that removes the meteor
	}
}

/**
 * `writing-mode` is `horizontal-tb`, so `inlineSize` is `width` and `blockSize` is `height`.
 */
const meteorShowerResizeObserver = new ResizeObserver(([{ borderBoxSize: [{ inlineSize: width, blockSize: height }] }]) => {
	maxX = width;
	maxY = height;
	maxDistance = Math.sqrt(width ** 2 + height ** 2);
	minDistance = maxDistance / 2;
	angle = -Math.atan2(height, width);
});

meteorShowerResizeObserver.observe(meteorRootHtml);

const meteorShowerIntersectionObserver = new IntersectionObserver(([{ isIntersecting }]) => {
	if (isIntersecting) {
		if (!timer) {
			startMeteorShower();
			shouldAnimate = true;
		}
	} else {
		stopMeteorShower();
		shouldAnimate = false;
	}
}, {
	threshold: 0.08,
});

meteorShowerIntersectionObserver.observe(meteorRootHtml);

document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		stopMeteorShower();
	} else if (!timer && shouldAnimate) {
		startMeteorShower();
	}
});

const projects = /**@type {NodeListOf<HTMLImageElement>}*/(document.querySelectorAll('.project'));
const projectLink = /**@type {HTMLAnchorElement}*/(document.getElementById('project-link'));
const projectName = /**@type {HTMLDivElement}*/(document.getElementById('project-name'));

const projectIntersectionObserver = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (entry.isIntersecting) {
			const project = /**@type {HTMLImageElement}*/(entry.target);
			projectLink.href = /**@type {string}*/(project.dataset.repo);
			projectName.textContent = project.alt;
		}
	}
}, {
	root: document.getElementById('project-root'),
	threshold: 0.9,
});

for (const project of projects) {
	projectIntersectionObserver.observe(project);
}
