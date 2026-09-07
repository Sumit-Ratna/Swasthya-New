/**
 * Facility Distance & Routing Engine - Manual Demo & Verification CLI
 * 
 * Usage:
 *   node examples/demo.js
 */

const { createRoutingEngine } = require('../src');
const sampleRequest = require('./sample-batch-request.json');

async function runDemo() {
    console.log('========================================================================');
    console.log('🏥 FACILITY DISTANCE & ROUTING ENGINE (OSM / OSRM) - DEMO EXECUTION');
    console.log('========================================================================\n');

    const engine = createRoutingEngine();

    console.log('📍 Origin Point (Patient Location):');
    console.log(`   Latitude:  ${sampleRequest.origin.latitude}`);
    console.log(`   Longitude: ${sampleRequest.origin.longitude}`);
    console.log(`   Profile:   ${sampleRequest.profile}\n`);

    console.log(`🔍 Evaluating ${sampleRequest.facilities.length} Healthcare Facilities via OSRM...\n`);

    try {
        // --- 1. First Execution (Cold Cache / Live OSRM Calculation) ---
        console.time('⏱️  Routing Execution Time');
        const result = await engine.calculateFacilityRoutes(sampleRequest);
        console.timeEnd('⏱️  Routing Execution Time');

        console.log('\n------------------------------------------------------------------------');
        console.log('🏆 NEAREST HEALTHCARE FACILITY IDENTIFIED:');
        console.log('------------------------------------------------------------------------');
        if (result.nearestFacility) {
            console.log(`   ID:             ${result.nearestFacility.id}`);
            console.log(`   Name:           ${result.nearestFacility.name}`);
            console.log(`   Type:           ${result.nearestFacility.type}`);
            console.log(`   Road Distance:  ${result.nearestFacility.distanceFormatted} (${result.nearestFacility.distanceMeters} meters)`);
            console.log(`   Travel Time:    ${result.nearestFacility.durationFormatted} (${result.nearestFacility.durationSeconds} seconds)`);
            console.log(`   Source:         ${result.nearestFacility.distanceSource}`);
            console.log(`   Status:         ${result.nearestFacility.status}`);
        } else {
            console.log('   No reachable facilities found.');
        }

        console.log('\n------------------------------------------------------------------------');
        console.log('📊 ALL FACILITIES RANKED BY ACTUAL ROAD DISTANCE:');
        console.log('------------------------------------------------------------------------');
        console.table(
            result.facilities.map(f => ({
                Rank: `#${f.rank}`,
                ID: f.id,
                Facility: f.name.length > 28 ? f.name.slice(0, 25) + '...' : f.name,
                Type: f.type,
                'Road Dist': f.distanceFormatted,
                'Travel Time': f.durationFormatted,
                Source: f.distanceSource,
                Cached: f.cached ? 'YES' : 'NO',
                Status: f.status
            }))
        );

        // --- 2. Second Execution (Hot Cache Demonstration) ---
        console.log('\n🔄 Repeating calculation to demonstrate In-Memory Route Caching...');
        console.time('⏱️  Cached Execution Time');
        const cachedResult = await engine.calculateFacilityRoutes(sampleRequest);
        console.timeEnd('⏱️  Cached Execution Time');

        console.log(`   Cache Stats: Hits: ${engine.getCacheStats().hits}, Misses: ${engine.getCacheStats().misses}, Size: ${engine.getCacheStats().size}`);

        console.log('\n========================================================================');
        console.log('✅ Demo execution completed successfully.');
        console.log('========================================================================\n');

    } catch (err) {
        console.error('❌ Demo execution encountered an error:', err.message);
        if (err.details) {
            console.error('   Details:', err.details);
        }
    }
}

runDemo();
