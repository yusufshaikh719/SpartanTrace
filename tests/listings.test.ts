import { describe, test, expect } from 'vitest';
import { campusDate, dateBounds, filterListings, listingErrors } from '../src/utils/listings';
import type { Listing } from '../src/types';
const item = (id: string, changes: Partial<Listing> = {}): Listing => ({ id, finderId:'finder', finderName:'Finder', finderEmail:'finder@sjsu.edu', title:'Blue bag', description:'With black straps', category:'Bags & Backpacks', locationFound:'Student Union', dateFound:'2026-01-01', status:'Available', createdAt:'2026-01-01T12:00:00Z', updatedAt:'2026-01-01T12:00:00Z', photoUrl:'https://example.com/bag.jpg', ...changes });
describe('search, validation and campus dates', () => {
 test('keyword search uses title and description, not location/category', () => {
  expect(filterListings([item('a')],{keyword:'Student'})).toEqual([]);
  expect(filterListings([item('a')],{keyword:'missing straps'})).toHaveLength(1);
 });
 test('individual keyword relevance orders title before description, breaks ties by newest', () => {
  const results = filterListings([item('a',{title:'Found item', description:'Blue bag found', createdAt:'2026-01-03'}),item('b'),item('c',{createdAt:'2026-01-02'})],{keyword:'blue bag'});
  expect(results.map((x)=>x.id)).toEqual(['c','b','a']);
 });
 test('newest overrides relevance; filters intersect and clear independently', () => {
  const items=[item('a'),item('b',{category:'Electronics',dateFound:'2026-01-02',createdAt:'2026-01-02'}),item('c',{locationFound:'Library'})];
  expect(filterListings(items,{keyword:'blue',sort:'newest'})[0].id).toBe('b');
  expect(filterListings(items,{category:'Bags & Backpacks',location:'Student Union',dateFrom:'2026-01-01',dateTo:'2026-01-01'}).map(x=>x.id)).toEqual(['a']);
  expect(filterListings(items,{category:'All',location:'Student Union'})).toHaveLength(2);
 });
 test('removed and returned items leave search; histories retain Returned items', () => {
  const items=[item('a',{status:'Returned'}),item('b',{isRemoved:true})];
  expect(filterListings(items)).toHaveLength(0);
  expect(filterListings(items,{finderId:'finder'})).toHaveLength(1);
  expect(filterListings(items,{claimantId:'looker'})).toHaveLength(1);
 });
 test('campus date remains correct across UTC midnight and DST boundaries', () => {
  expect(campusDate(new Date('2026-11-17T02:00:00Z'))).toBe('2026-11-16');
  expect(dateBounds('3days',new Date('2026-11-17T02:00:00Z'))).toEqual({dateFrom:'2026-11-14',dateTo:'2026-11-16'});
  expect(dateBounds('7days',new Date('2026-03-09T02:00:00Z'))).toEqual({dateFrom:'2026-03-02',dateTo:'2026-03-08'});
 });
 test('date windows include the requested number of calendar days', () => {
  expect(dateBounds('today',new Date('2026-01-01T20:00:00Z'))).toEqual({dateFrom:'2026-01-01',dateTo:'2026-01-01'});
  expect(dateBounds('30days',new Date('2026-01-01T20:00:00Z'))).toEqual({dateFrom:'2025-12-03',dateTo:'2026-01-01'});
  expect(dateBounds('all')).toEqual({});
 });
 test('new and edited listings share required-field, photo and date validation', () => {
  expect(listingErrors(item('a'))).toEqual({});
  expect(listingErrors(item('a',{photoUrl:'',dateFound:'2026-02-30',title:'',description:'',locationFound:''}))).toHaveProperty('photoUrl');
  expect(listingErrors(item('a',{dateFound:'2026-02-30'}))).toHaveProperty('dateFound');
  expect(listingErrors(item('a',{dateFound:'2099-01-01'}))).toHaveProperty('dateFound');
  expect(listingErrors(item('a',{photoUrl:'javascript:alert(1)'}))).toHaveProperty('photoUrl');
 });
});
