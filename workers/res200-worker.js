import { getPlayerHtml } from './templates/playerTemplate.js';
import { getWebRtcHtml } from './templates/webrtcTemplate.js';
import { getSfuHtml } from './templates/sfuTemplate.js';
import { getChatHtml } from './templates/websocketTemplate.js';

// CORS 유틸리티 함수
function corsHeaders() {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400'
	};
}

// JSON 응답 유틸리티 함수
function jsonResponse(obj, status = 200, extraHeaders = {}) {
	const headers = Object.assign({}, corsHeaders(), { 'Content-Type': 'application/json' }, extraHeaders);
	return new Response(JSON.stringify(obj), { status, headers });
}

//정의된 경로
const definedPaths = [
	'/favicon.ico',
	'/logo.jpg',
	'/404.jpg',
	'/malgnPlayer.js',
	'/js/notice2.c.js', '/js/notice0.c.js',
	'/js/dashall.c.js', '/js/dashall.c.js.LICENSE.txt',
	'/js/dashmss.c.js', '/js/dashmss.c.js.LICENSE.txt',
	'/js/hls.c.js', '/js/hls.c.js.LICENSE.txt',
	'/css/fonts/wecandeoIcon..eot',
	'/css/fonts/wecandeoIcon..svg',
	'/css/fonts/wecandeoIcon..ttf',
	'/css/fonts/wecandeoIcon..woff',
];

export async function handleRequest(request, env) {

	// OPTIONS preflight 처리
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders() });
	}

	const url = new URL(request.url);
	const pathname = url.pathname;

	// 정의된 경로로 들어온 요청 처리
	if (request.method === 'GET' && definedPaths.includes(pathname)) {
		const destinationURL = `https://gate1253.pages.dev/public${pathname}`;
		return new Response(null, {
			status: 302,
			headers: Object.assign({ 'Location': destinationURL }, corsHeaders())
		});
	}


	// GET /{uniqueUserId}/{alias} 패턴만 처리
	if (request.method === 'GET' && pathname.length > 1) {
		const fullPath = pathname.slice(1); // 예: "user123abcde/my/custom/code"
		const pathSegments = fullPath.split('/');
		let targetCode = null; // KV에서 조회할 최종 키

		// 첫 번째 세그먼트가 uniqueUserId (영숫자)처럼 보이고, 경로 세그먼트가 2개 이상인 경우
		// 즉, 커스텀 코드 패턴인 /{uniqueUserId}/{alias}인 경우에만 처리
		const isCustomCodePattern = pathSegments.length >= 2 && /^[a-z0-9]+$/i.test(pathSegments[0]);

		if (isCustomCodePattern) {
			// KV 키는 전체 경로 (예: "user123abcde/my/custom/code")
			targetCode = fullPath;
		}
		// 그 외의 경우 (예: /{code} 패턴 또는 유효하지 않은 커스텀 코드 패턴)는 처리하지 않음

		if (targetCode) {
			const target = env.RES302_KV ? await env.RES302_KV.get(targetCode) : null;
			if (target) {

				// 1. Player
				if (url.searchParams.get('with') === 'player' && url.searchParams.get('type') === 'html') {
					const html = getPlayerHtml(target);
					return new Response(html, { status: 200, headers: Object.assign({ 'Content-Type': 'text/html;charset=UTF-8' }, corsHeaders()) });
				}

				// 2. WebRTC
				if (url.searchParams.get('with') === 'webrtc' && url.searchParams.get('type') === 'html') {
					let iceServers = [];
					const cacheKey = "ICE_SERVERS_CACHE";

					if (env.RES302_KV) {
						const cached = await env.RES302_KV.get(cacheKey);
						if (cached) iceServers = JSON.parse(cached);
					}

					if (iceServers.length === 0 && env.CF_TURN_ID && env.CF_TURN_KEY) {
						try {
							const turnResponse = await fetch(
								`https://rtc.live.cloudflare.com/v1/turn/keys/${env.CF_TURN_ID}/credentials/generate-ice-servers`,
								{
									method: 'POST',
									headers: {
										'Authorization': `Bearer ${env.CF_TURN_KEY}`,
										'Content-Type': 'application/json'
									},
									body: JSON.stringify({ ttl: 86400 })
								}
							);
							if (turnResponse.ok) {
								const turnData = await turnResponse.json();
								iceServers = turnData.iceServers || [];
								if (iceServers.length > 0 && env.RES302_KV) {
									await env.RES302_KV.put(cacheKey, JSON.stringify(iceServers), { expirationTtl: 3600 });
								}
							}
						} catch (e) {
							console.error('Failed to fetch dynamic ICE servers:', e);
						}
					}

					const html = getWebRtcHtml(target, targetCode, iceServers);
					return new Response(html, { status: 200, headers: Object.assign({ 'Content-Type': 'text/html;charset=UTF-8' }, corsHeaders()) });
				}

				// 3. WebSocket
				if (url.searchParams.get('with') === 'websocket' && url.searchParams.get('type') === 'html') {
					const wsTarget = env.WS_SERVER_URL || target;
					const html = getChatHtml(wsTarget, targetCode);
					return new Response(html, { status: 200, headers: Object.assign({ 'Content-Type': 'text/html;charset=UTF-8' }, corsHeaders()) });
				}

				// 4. SFU (Cloudflare Calls)
				if (url.searchParams.get('with') === 'sfu' && url.searchParams.get('type') === 'html') {
					const wsTarget = env.WS_SERVER_URL || target;
					const webrtcApiUrl = env.WEBRTC_API_URL || 'https://webrtc.gate1253.workers.dev';
					const html = getSfuHtml(wsTarget, targetCode, webrtcApiUrl);
					return new Response(html, { status: 200, headers: Object.assign({ 'Content-Type': 'text/html;charset=UTF-8' }, corsHeaders()) });
				}

				// Expiration Check
				if (env.REQ_TIME_KV) {
					const expirationTimestamp = await env.REQ_TIME_KV.get(targetCode);
					if (expirationTimestamp) {
						const expirationTime = parseInt(expirationTimestamp, 10);
						if (Date.now() > expirationTime) {
							return new Response('Forbidden: This link has expired.', { status: 403, headers: corsHeaders() });
						}
					}
				}

				// Redirect / Count logic / QueryString Forwarding
				let finalTarget = target;
				try {
					const targetUrl = new URL(target);

					// 1. QueryString Forwarding check
					const isForwardingEnabled = 
						(targetUrl.searchParams.get('with') === 'querystring' && targetUrl.searchParams.get('type') === 'forward') ||
						(url.searchParams.get('with') === 'querystring' && url.searchParams.get('type') === 'forward');

					if (isForwardingEnabled) {
						// Append calling query strings
						for (const [key, value] of url.searchParams.entries()) {
							targetUrl.searchParams.set(key, value);
						}
						finalTarget = targetUrl.toString();
					}

					// 2. Count increment logic
					if (targetUrl.searchParams.get('cnt') === '${cnt}' && env.REQ_COUNT_KV) {
						let count = await env.REQ_COUNT_KV.get(targetCode);
						count = count ? parseInt(count, 10) : 0;
						const newCount = count + 1;
						await env.REQ_COUNT_KV.put(targetCode, newCount.toString());
						targetUrl.searchParams.set('cnt', newCount);
						finalTarget = targetUrl.toString();
					}
				} catch (e) {
					// target might not be a valid URL, just redirect to whatever it is if possible
					console.warn('Invalid target URL for logic processing:', target);
				}

				return new Response(null, { status: 302, headers: Object.assign({ Location: finalTarget }, corsHeaders()) });
			}
		}
		return new Response(`Not found`, { status: 404, headers: corsHeaders() });
	}

	// GET 요청이 아니거나, GET 요청이지만 커스텀 코드 패턴이 아닌 경우
	return new Response(`Not found`, { status: 404, headers: corsHeaders() });
}

export default {
	fetch: handleRequest
};
