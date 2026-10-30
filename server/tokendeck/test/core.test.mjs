import test from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../router.mjs';
import { encryptSecret, decryptSecret } from '../vault.mjs';
test('priority skips disabled',()=>{const r=new Router();const k=[{alias:'bad',priority:0,enabled:false},{alias:'good',priority:2,enabled:true}];assert.equal(r.choose(k,'m'),k[1]);});
test('round robin rotates',()=>{const r=new Router({strategy:'round-robin'});const k=[{alias:'a'},{alias:'b'}];assert.equal(r.choose(k,'m').alias,'a');assert.equal(r.choose(k,'m').alias,'b');});
test('429 starts cooldown',()=>{const r=new Router();const k={};r.cooldown(k,429);assert.ok(k.cooldownUntil>Date.now());assert.equal(k.failures,1);});
test('AES GCM round trip',()=>{const master=Buffer.alloc(32,7);const e=encryptSecret('fake-provider-key',master);assert.equal(decryptSecret(e,master),'fake-provider-key');});
