// scripts/libp2p-diagnostic.js
import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { FaultTolerance } from '@libp2p/interface';
import WebSocket from 'ws';
import { exec } from 'child_process';
import * as dns from 'dns/promises';
import * as fs from 'fs/promises';
import { promisify } from 'util';

// Promisify exec for cross-platform command execution
const execPromise = promisify(exec);

// Bootstrap nodes from your CitizenX configuration (useAuth.ts, useUserProfile.ts)
const bootstrapNodes = [
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPAeL4N3XUjZx4j4vJqJ5gMhW8f1z2W9z5pQ',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAx2BN6eJ2B2kB4fTdhFVvNx2jdhqWvT9nHmtjNx',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2Ec7tF1R8h6b9XyXzH6j8N2uD4v6q5Z9kM7uR5vM'
];

// Extract unique hosts from bootstrap nodes
const hosts = [...new Set(bootstrapNodes.map(node => {
  const match = node.match(/\/dns4\/([^\/]+)/);
  return match ? match[1] : null;
}).filter(host => host))];

// Diagnostic results object
const results = {
  gateway_availability: [],
  dns_resolution: [],
  websocket_connectivity: [],
  peer_discovery: {
    peers_found: 0,
    peer_ids: []
  },
  pubsub: {
    messages_published: 0,
    messages_received: 0,
    received_messages: []
  }
};

async function testGatewayAvailability() {
  console.log('Testing gateway availability...');
  for (const host of hosts) {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? `ping -n 4 ${host}` : `ping -c 4 ${host}`;
    let result = { host, reachable: false, error: null };

    try {
      const { stdout, stderr } = await execPromise(command);
      // Check for successful ping responses
      const success = isWindows ? stdout.includes('Reply from') : stdout.includes('4 received');
      result.reachable = success;
      if (!success) {
        result.error = stderr || 'No response received';
      }
    } catch (error) {
      result.error = error.message;
    }

    results.gateway_availability.push(result);
    console.log(`- ${host}: ${result.reachable ? 'Reachable' : `Unreachable (${result.error})`}`);
  }
}

async function testDNSResolution() {
  console.log('Testing DNS resolution...');
  for (const host of hosts) {
    let result = { host, ip: null, error: null };

    try {
      const addresses = await dns.lookup(host);
      result.ip = addresses.address;
    } catch (error) {
      result.error = error.message;
    }

    results.dns_resolution.push(result);
    console.log(`- ${host}: ${result.ip ? `Resolved to ${result.ip}` : `DNS Resolution Failed (${result.error})`}`);
  }
}

async function testWebSocketConnectivity() {
  console.log('Testing WebSocket connectivity...');
  for (const node of bootstrapNodes) {
    const match = node.match(/\/dns4\/([^\/]+)\/tcp\/(\d+)\/wss/);
    if (!match) continue;

    const host = match[1];
    const port = match[2];
    const wsUrl = `wss://${host}:${port}`;
    let result = { host: `${host}:${port}`, status: 'Failed', error: null };

try {
    await new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, { timeout: 5000 });
        ws.on('open', () => {
            result.status = 'Succeeded';
            ws.close();
            resolve();
        });
        ws.on('error', (error) => {
            result.error = error.message || 'Connection failed';
            reject(error);
        });
        ws.on('close', () => resolve());
    });
} catch (error) {
    result.error = error.message || 'Connection failed';
}

results.websocket_connectivity.push(result);
console.log(`- ${host}:${port}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
}
}

async function testPeerDiscovery() {
    console.log('Testing peer discovery...');
    const helia = await createHelia({
        libp2p: {
            transports: [webSockets(), webRTC(), circuitRelayTransport()],
            transportManager: { faultTolerance: FaultTolerance.NO_FATAL },
            peerDiscovery: [
                bootstrap({
                    list: bootstrapNodes
                })
            ],
            services: {
                identify: identify(),
                pubsub: gossipsub()
            }
        }
    });

    // Listen for peer discovery events
    helia.libp2p.addEventListener('peer:discovery', (event) => {
        const peerId = event.detail.id.toString();
        if (!results.peer_discovery.peer_ids.includes(peerId)) {
            results.peer_discovery.peer_ids.push(peerId);
            results.peer_discovery.peers_found++;
            console.log(`- Discovered peer: ${peerId}`);
        }
    });

    // Wait for 30 seconds to discover peers
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Stop the node
    await helia.stop();
    console.log(`Peer Discovery: Found ${results.peer_discovery.peers_found} peers`);
}

async function testPubsub() {
    console.log('Testing pubsub...');
    const helia = await createHelia({
        libp2p: {
            transports: [webSockets(), webRTC(), circuitRelayTransport()],
            transportManager: { faultTolerance: FaultTolerance.NO_FATAL },
            peerDiscovery: [
                bootstrap({
                    list: bootstrapNodes
                })
            ],
            services: {
                identify: identify(),
                pubsub: gossipsub()
            }
        }
    });

    const topic = '/citizenx/test-topic';

    // Subscribe to the test topic
    helia.libp2p.services.pubsub.subscribe(topic);
    helia.libp2p.services.pubsub.addEventListener('message', (event) => {
        if (event.detail.topic === topic) {
            const message = new TextDecoder().decode(event.detail.data);
            results.pubsub.messages_received++;
            results.pubsub.received_messages.push(message);
            console.log(`- Received message: ${message}`);
        }
    });

    // Publish test messages
    for (let i = 1; i <= 5; i++) {
        const message = `Test message ${i} from ${helia.libp2p.peerId.toString()}`;
        await helia.libp2p.services.pubsub.publish(topic, new TextEncoder().encode(message));
        results.pubsub.messages_published++;
        console.log(`- Published message: ${message}`);
        // Wait 2 seconds between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Wait an additional 10 seconds to receive messages
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop the node
    await helia.stop();
    console.log(`Pubsub: Published ${results.pubsub.messages_published} messages, Received ${results.pubsub.messages_received} messages`);
}

async function generateReport() {
    console.log('\n=== libp2p Gateway Diagnostic Report ===');
    console.log('1. Gateway Availability:');
    results.gateway_availability.forEach(result => {
        console.log(`  - ${result.host}: ${result.reachable ? 'Reachable' : `Unreachable (${result.error})`}`);
    });

    console.log('2. DNS Resolution:');
    results.dns_resolution.forEach(result => {
        console.log(`  - ${result.host}: ${result.ip ? `Resolved to ${result.ip}` : `DNS Resolution Failed (${result.error})`}`);
    });

    console.log('3. WebSocket Connectivity:');
    results.websocket_connectivity.forEach(result => {
        console.log(`  - ${result.host}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
    });

    console.log('4. Peer Discovery:');
    console.log(`  - Found ${results.peer_discovery.peers_found} peers: [${results.peer_discovery.peer_ids.join(', ')}]`);

    console.log('5. Pubsub:');
    console.log(`  - Published ${results.pubsub.messages_published} messages, Received ${results.pubsub.messages_received} messages`);
    if (results.pubsub.received_messages.length > 0) {
        console.log('  - Received Messages:');
        results.pubsub.received_messages.forEach(msg => console.log(`    - ${msg}`));
    }

    // Save report to file
    await fs.writeFile('diagnostic-report.json', JSON.stringify(results, null, 2));
    console.log('\nReport saved to diagnostic-report.json');
}

async function runDiagnostics() {
    try {
        await testGatewayAvailability();
        await testDNSResolution();
        await testWebSocketConnectivity();
        await testPeerDiscovery();
        await testPubsub();
        await generateReport();
    } catch (error) {
        console.error('Diagnostic failed:', error);
        process.exit(1);
    }
}

// Run the diagnostics
await runDiagnostics();