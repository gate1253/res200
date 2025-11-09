export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetBaseUrl = env.TARGET_URL;
    
    // TARGET_URL이 슬래시로 끝나지 않으면 추가
    const initialUrl = targetBaseUrl.endsWith('/') 
      ? `${targetBaseUrl}${url.pathname.substring(1)}${url.search}`
      : `${targetBaseUrl}${url.pathname}${url.search}`;

    try {
      const response = await fetch(initialUrl, { // fetch 호출 주석 해제
        method: request.method, // 원본 요청 메서드 전달
        headers: request.headers, // 원본 요청 헤더 전달
        body: request.body, // 원본 요청 본문 전달 (GET/HEAD 요청에는 null)
        redirect: "follow", // 중요: 리디렉션을 자동으로 따라감
      });

      // 응답 코드가 400 이상이면 JSON으로 400 ERROR 응답
      if (response.status >= 400) {
        return new Response(JSON.stringify({ error: "400 ERROR", status: response.status }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
    //   return response; // 정상 응답 반환

      // targetBaseUrl을 JSON으로 응답 (이전 코드 주석 처리)
    //   return new Response(JSON.stringify({ targetUrl: initialUrl }), {
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    } catch (error) {
      console.error("Error fetching initial URL:", error);
      return new Response("Internal Server Error", { status: 500 }); // 오류 메시지 정리
    }
  },
};
