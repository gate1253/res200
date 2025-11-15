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
			const target = await env.RES302_KV.get(targetCode);
			if(target){

				// 추가: R1 타입의 만료 시간 확인
				const expirationTimestamp = await env.REQ_TIME_KV.get(targetCode);
				
				if (expirationTimestamp) {
					const expirationTime = parseInt(expirationTimestamp, 10);
					const currentTime = Date.now();

					// 현재 시간이 만료 시간보다 크면, 링크는 만료된 것입니다.
					if (currentTime > expirationTime) {
						return new Response('Forbidden: This link has expired.', { status: 403, headers: corsHeaders() });
					}
				}

				let finalTarget = target;
				const url = new URL(target);

				// target URL의 쿼리스트링에 'cnt=${cnt}'가 있는지 확인합니다.
				if (url.searchParams.get('cnt') === '${cnt}') {
					// REQ_COUNT_KV에서 현재 카운트를 가져옵니다. 없으면 0으로 시작합니다.
					let count = await env.REQ_COUNT_KV.get(targetCode);
					count = count ? parseInt(count, 10) : 0;

					// 카운트를 1 증가시킵니다.
					const newCount = count + 1;

					// 증가된 카운트를 KV에 다시 저장합니다.
					await env.REQ_COUNT_KV.put(targetCode, newCount.toString());

					// URL의 'cnt' 파라미터 값을 새로운 카운트로 교체합니다.
					url.searchParams.set('cnt', newCount);
					finalTarget = url.toString();
				}

				return new Response(null, {status:302, headers: Object.assign({Location: finalTarget}, corsHeaders())});
			}
		}
		// URL을 찾지 못했거나 패턴에 맞지 않는 경우
		return new Response(`Not found`, {status:404, headers: corsHeaders()});
	}
	
	// GET 요청이 아니거나, GET 요청이지만 커스텀 코드 패턴이 아닌 경우
	return new Response(`Not found`, {status:404, headers: corsHeaders()});
}

export default {
	fetch: handleRequest
};
