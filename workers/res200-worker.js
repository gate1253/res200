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
	const headers = Object.assign({}, corsHeaders(), {'Content-Type':'application/json'}, extraHeaders);
	return new Response(JSON.stringify(obj), {status, headers});
}

export async function handleRequest(request, env){

	// OPTIONS preflight 처리
	if(request.method === 'OPTIONS'){
		return new Response(null, {status:204, headers: corsHeaders()});
	}

	const url = new URL(request.url);
	const pathname = url.pathname;

	// GET /{uniqueUserId}/{alias} 패턴만 처리
	if(request.method === 'GET' && pathname.length > 1){
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
			// RES302_KV에서 URL 조회
			const target = await env.RES302_KV.get(targetCode);
			if(target){
				// URL을 찾으면 200 OK와 함께 JSON 응답으로 반환
				return new Response(null, {status:302, headers: Object.assign({Location: target}, corsHeaders())});
			}
		}
		// URL을 찾지 못했거나 패턴에 맞지 않는 경우
		return new Response(`Not found ${pathSegments}`, {status:404, headers: corsHeaders()});
	}
	
	// GET 요청이 아니거나, GET 요청이지만 커스텀 코드 패턴이 아닌 경우
	return new Response('Not found', {status:404, headers: corsHeaders()});
}

export default {
	fetch: handleRequest
};
