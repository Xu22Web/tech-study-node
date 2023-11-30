module.exports = {
    apps: [
        {
            name: 'xuexiqiangguo',
            script: './dist/bin/index.js',
            cwd: './',
            watch: false,
            instances: 1,
            autorestart: true,
            max_memory_restart: '1024M',
            env: { NODE_ENV: 'production' },
        }
    ],
};
