import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRevenueFilters } from "../src/features/analytics/filters";
import { money,barPercent } from "../src/features/analytics/domain";
test("report calendar filters support day/month/year/custom and default Vietnamese month",()=>{
 const now="2026-10-31";
 const defaultPeriod=parseRevenueFilters({},now);assert.equal(defaultPeriod.start,"2026-10-01");assert.equal(defaultPeriod.end,"2026-11-01");
 assert.equal(parseRevenueFilters({mode:"day",value:"2026-12-31"},now).end,"2027-01-01");
 assert.equal(parseRevenueFilters({mode:"month",value:"2024-02"},now).end,"2024-03-01");
 assert.equal(parseRevenueFilters({mode:"year",value:"2026"},now).start,"2026-01-01");
 assert.equal(parseRevenueFilters({mode:"custom",from:"2026-10-31",to:"2026-11-01"},now).end,"2026-11-02");
 assert.equal(parseRevenueFilters({mode:"all"},now).start,null);
 assert.ok(parseRevenueFilters({mode:"custom",from:"2026-11-01",to:"2026-10-31"},now).error);
 assert.ok(parseRevenueFilters({mode:"day",value:"2026-02-30"},now).error);
});
test("financial display retains whole VND beyond JavaScript safe integer",()=>{
 assert.equal(money("9007199254740993").replace(/\D/g,""),"9007199254740993");
 assert.equal(barPercent("1","3"),33.33);
 assert.equal(barPercent("0","0"),0);
});
