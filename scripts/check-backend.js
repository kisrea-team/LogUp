const http = require('http');

const checkBackend = () => {
    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/',
        method: 'GET',
        timeout: 5000,
    };

    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            console.log('✅ 后端服务运行正常 (http://localhost:8000)');
        } else {
            console.log(`⚠️ 后端服务响应异常，状态码: ${res.statusCode}`);
        }
    });

    req.on('error', (err) => {
        console.log('❌ 后端服务未启动或无法连接');
        console.log('请运行以下命令启动后端服务:');
        console.log('cd backend');
        console.log('python start.py');
    });

    req.on('timeout', () => {
        console.log('⏱️ 连接超时，后端服务可能未响应');
        req.destroy();
    });

    req.end();
};

checkBackend();
