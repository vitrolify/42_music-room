import assert from 'node:assert/strict';
import test from 'node:test';
import { mockDeviceDelegationGateway } from '../src/lib/deviceDelegation.mock.ts';

test('mock gateway supports the complete local delegation flow', async () => {
    const initial = await mockDeviceDelegationGateway.load('test-owner', 'test-device-id');
    const device = initial.devices.find(item => item.isCurrent);
    assert.ok(device);

    const renamed = await mockDeviceDelegationGateway.rename(device.id, 'Living room browser');
    assert.equal(renamed.name, 'Living room browser');

    const granted = await mockDeviceDelegationGateway.grant(device.id, 'friend-caio');
    assert.equal(granted.displayName, 'Caio Nunes');
    await assert.rejects(
        mockDeviceDelegationGateway.grant(device.id, 'friend-caio'),
        /already has access/,
    );

    await mockDeviceDelegationGateway.revoke(device.id, 'friend-caio');
    const final = await mockDeviceDelegationGateway.load('test-owner', 'test-device-id');
    assert.equal(final.delegatesByDevice[device.id].some(item => item.userId === 'friend-caio'), false);
});
