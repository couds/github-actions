const https = require('https');

const { packages, GITHUB_TOKEN } = process.env;

const [,, org, version] = process.argv;

console.log('inputs', { org, packages, version })

const request = ({ method, path, data = '' }) => {
  return new Promise((resolve, reject) => {
    console.log(`[${method}] ${path}`)
    const req = https.request({
      method,
      protocol: 'https:',
      hostname: 'api.github.com',
      path,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${GITHUB_TOKEN}`,
        'user-agent': 'axios',
      }
    }, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve({})
        }
      })
    }).on('error', err => {
      reject(err);
    })

    req.write(data)
    req.end()
  })
};

const deletePackage = async (package) => {
  if (![org, package, version, GITHUB_TOKEN].every(Boolean)) {
    console.log('missing parameter, ensure you are passing the version to the script')
    return;
  }
  try {
    const versions = await request({ method: 'get', path: `/orgs/${org}/packages/npm/${package}/versions?per_page=100` });

    if (!versions || !Array.isArray(versions)) {
      console.log('error', versions)
      return;
    }

    const filtered = versions.filter((v) => {
      return v.name.toLowerCase() === version.toLowerCase() || v.name.toLowerCase().includes(`-${version.toLowerCase()}`)
    });

    console.log(package, 'Versions to remove', filtered.length);

    await filtered.reduce(async (promise, v) => {
      await promise;
      return request({ method: 'delete', path: `/orgs/${org}/packages/npm/${package}/versions/${v.id}` });
    }, Promise.resolve());
  } catch (e) {
    console.error('Could not remove packages', e.message);
  }
}

if (packages.trim().startsWith('[')) {
  JSON.parse(packages).map(deletePackage);
} else {
  deletePackage(packages);
}

