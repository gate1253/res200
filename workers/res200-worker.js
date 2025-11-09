export default {
  async fetch(request, env) { // 타입 주석 제거
    const url = new URL(request.url);
    const targetBaseUrl = env.TARGET_URL;
    
    // TARGET_URL이 슬래시로 끝나지 않으면 추가
    // const initialUrl = targetBaseUrl.endsWith('/') 
    //   ? `${targetBaseUrl}${url.pathname.substring(1)}${url.search}`
    //   : `${targetBaseUrl}${url.pathname}${url.search}`;

    try {
      // const response = await fetch(initialUrl, { // fetch 호출 주석 처리
      //   method: request.method, // 원본 요청 메서드 전달
      //   headers: request.headers, // 원본 요청 헤더 전달
      //   body: request.body, // 원본 요청 본문 전달 (GET/HEAD 요청에는 null)
      //   redirect: "follow", // 중요: 리디렉션을 자동으로 따라감
      // });
      // return response;

      // targetBaseUrl을 JSON으로 응답
      return new Response(JSON.stringify({ targetUrl: targetBaseUrl }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error("Error fetching initial URL:", error);
      return new Response("Internal Server Error" + error, { status: 500 });
    }
  },
};
