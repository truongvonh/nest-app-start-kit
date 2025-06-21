/// <reference path="./.sst/platform/config.d.ts" />

const appVpc = {
  name: 'api-app-vpc',
  run: ($app: { stage: string }) =>
    new sst.aws.Vpc(appVpc.name.concat('-').concat($app.stage)),
};

const ecs = {
  components: {
    Cluster: 'api-app-clt',
    Service: 'api-app-svc',
  },
  run: (vpc: sst.aws.Vpc, $app: { stage: string }) => {
    const cluster = new sst.aws.Cluster(
      ecs.components.Cluster.concat('-').concat($app.stage),
      { vpc },
    );
    return cluster.addService(ecs.components.Service.concat($app.stage), {
      public: {
        ports: [
          {
            listen: '80/http',
            forward: '3000/http',
          },
        ],
      },
      architecture: 'arm64',
      cpu: '0.5 vCPU',
      memory: '1 GB',
      scaling: {
        max: 1,
        min: 1,
        cpuUtilization: 90,
        memoryUtilization: 80,
      },
      dev: { command: 'nodemon dist/main.js' },
      health: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3030/ || exit 1'],
        startPeriod: '60 seconds',
        timeout: '10 seconds',
        interval: '30 seconds',
      },
      loadBalancer: {
        domain: {
          name: `learning-${$app.stage}.coinstrat.com`,
          dns: sst.aws.dns({
            zone: 'Z022387318NYVJD08XWL0',
          }),
        },
        rules: [
          {
            listen: '80/http',
            forward: '3000/http',
          },
          {
            listen: '443/https',
            forward: '3000/http',
          },
        ],
      },
    });
  },
};

export default $config({
  app(input) {
    return {
      name: 'nest-app-start-kit',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: {
          profile: 'serverless-dev',
          region: 'ap-southeast-1',
        },
        'docker-build': '0.0.8',
      },
    };
  },
  async run() {
    const vpc = appVpc.run($app);
    ecs.run(vpc, $app);
  },
});
