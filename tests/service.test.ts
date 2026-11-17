import { test, expect, vi } from 'vitest';
const fake = vi.hoisted(() => ({ client: null as any }));
vi.mock('../src/lib/supabase', () => ({ getSupabaseClient: () => fake.client }));
import { action, dbService, fromRow } from '../src/services/db';
test('missing configuration never creates a local success', async () => {
 fake.client = null;
 await expect(dbService.createAlert({userId:'user',keywords:'keys'})).rejects.toThrow(/Connect Supabase/);
 await expect(dbService.getListings()).rejects.toThrow(/Connect Supabase/);
});
test('PostgREST errors propagate, rather than silently saving browser data', async () => {
 fake.client = {rpc: vi.fn().mockResolvedValueOnce({data:2,error:null}).mockResolvedValue({data:null,error:{message:'row-level security denied'}})};
 await expect(action('create_claim',{})).rejects.toThrow(/security denied/);
 expect(fake.client.rpc).toHaveBeenCalledWith('app_action',{action:'create_claim',payload:{}});
});
test('nested API responses map to the app model', () => {
 expect(fromRow({claim:{claimant_id:'user',created_at:'now'},is_read:false})).toEqual({claim:{claimantId:'user',createdAt:'now'},isRead:false});
});

test('an old schema cannot look like a working empty registry; setup can be retried', async () => {
 fake.client = {rpc: vi.fn().mockResolvedValueOnce({data:null,error:{message:'missing app_version'}}).mockResolvedValueOnce({data:2,error:null}),from:vi.fn()};
 await expect(dbService.getListings()).rejects.toThrow(/setup is incomplete/);
 expect(fake.client.from).not.toHaveBeenCalled();
 const { assertDatabaseReady } = await import('../src/services/db');
 await expect(assertDatabaseReady()).resolves.toBe(fake.client);
});

test('notification history continues beyond Supabase default 1000-row response limit', async () => {
 const records=Array.from({length:1001},(_,index)=>({id:`notification-${index}`,user_id:'user',is_read:false}));
 const ranges: number[]=[];
 const query: any={select:()=>query,eq:()=>query,order:()=>query,range:(start:number,end:number)=>{ranges.push(start);return Promise.resolve({data:records.slice(start,end+1),error:null});}};
 fake.client={from:()=>query};
 const notifications=await dbService.getNotifications('user');
 expect(notifications).toHaveLength(1001);expect(ranges).toEqual([0,1000]);expect(notifications[1000].userId).toBe('user');
});
