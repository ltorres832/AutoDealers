const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const functionsDir = __dirname;
const apps = ['public-web', 'admin', 'dealer', 'seller', 'advertiser'];

console.log('🔨 Predeploy: Building all Next.js apps...');

// Helper function to copy directory
const copyRecursive = (src, dest) => {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (path.basename(src) === 'node_modules') {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

try {
  // Build all apps
  for (const app of apps) {
    const nextAppDir = path.resolve(functionsDir, '..', 'apps', app);
    const nextBuildDir = path.resolve(nextAppDir, '.next');
    const targetDir = path.resolve(functionsDir, app, '.next');

    console.log(`\n📦 Processing ${app}...`);
    console.log(`   App dir: ${nextAppDir}`);
    console.log(`   Target dir: ${targetDir}`);

    // Build Next.js
    console.log('   1. Running npm run build...');
    execSync('npm run build', {
      cwd: nextAppDir,
      stdio: 'inherit',
      shell: true,
    });

    // Verify build exists
    if (!fs.existsSync(nextBuildDir)) {
      throw new Error(`Build directory not found: ${nextBuildDir}`);
    }

    // Create target directory structure
    const targetParent = path.dirname(targetDir);
    if (!fs.existsSync(targetParent)) {
      fs.mkdirSync(targetParent, { recursive: true });
    }

    // Remove existing .next in functions if it exists
    if (fs.existsSync(targetDir)) {
      console.log('      Removing existing .next in functions/...');
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Copy .next directory
    console.log('   2. Copying .next directory...');
    copyRecursive(nextBuildDir, targetDir);

    // Copy next.config so Next server can run from functions/<app>
    const configNames = ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts'];
    for (const name of configNames) {
      const src = path.join(nextAppDir, name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(targetParent, name));
        console.log(`      Copied ${name}`);
      }
    }
    const publicDir = path.join(nextAppDir, 'public');
    if (fs.existsSync(publicDir)) {
      const destPublic = path.join(targetParent, 'public');
      if (fs.existsSync(destPublic)) fs.rmSync(destPublic, { recursive: true });
      copyRecursive(publicDir, destPublic);
      console.log('      Copied public/');
    }
    console.log(`   ✅ ${app} copied successfully!`);
  }

  console.log('\n✅ Predeploy complete! All apps built and copied.');
} catch (error) {
  console.error('❌ Predeploy failed:', error.message);
  process.exit(1);
}

