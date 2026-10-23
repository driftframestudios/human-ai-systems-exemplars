import '../../tools/node-runtime-admission.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { betaPosterior, betaAnyEvent, betaUpperTail, gammaPosterior, waitingProbability, waitingDensity, generator, forwardDerivative, propagate, expectedHandoffMinutes } from './model.mjs';
const near = (a,b,tolerance=1e-10) => assert.ok(Math.abs(a-b)<tolerance, `${a} vs ${b}`);
test('beta posterior and invalid event count',()=>{const p=betaPosterior(1,1,2,5);assert.equal(p.a,3);assert.equal(p.b,4);near(p.mean,3/7);assert.throws(()=>betaPosterior(1,1,3,2));});
test('beta-binomial integrates rate uncertainty',()=>{near(betaAnyEvent(1,1,0),0);near(betaAnyEvent(1,1,3),3/4);near(betaAnyEvent(2,3,2),3/5);assert.throws(()=>betaAnyEvent(1,1,-1));});
test('integer beta tail identities and prior sensitivity',()=>{near(betaUpperTail(1,1,.2),.8);near(betaUpperTail(1,3,.2),.512);near(betaUpperTail(3,1,.2),.992);near(betaUpperTail(2,2,.5),.5);near(betaUpperTail(20,20,.5),.5);assert.equal(betaUpperTail(2,3,0),1);assert.equal(betaUpperTail(2,3,1),0);});
test('Gamma-Poisson uses events and eligible exposure separately',()=>{assert.deepEqual(gammaPosterior(1,60,2,30),{shape:3,rate:90,meanRatePerMinute:1/30});near(waitingProbability(1,60,10),1/7);near(waitingDensity(1,60,0),1/60);near(waitingDensity(1,60,10),60/4900);});
test('waiting density matches CDF derivative and bounded tail approaches one',()=>{const h=10,delta=1e-4;near((waitingProbability(3,90,h+delta)-waitingProbability(3,90,h-delta))/(2*delta),waitingDensity(3,90,h),1e-8);near(waitingProbability(3,90,1e6),1,1e-12);});
test('generator and forward equation conserve probability',()=>{const rates={D_R:.1,R_V:.2,V_R:.05,V_H:.2};for(const row of generator(rates))near(row.reduce((a,b)=>a+b,0),0);near(forwardDerivative([.3,.3,.4,0],rates).reduce((a,b)=>a+b,0),0);assert.throws(()=>generator({unknown:1}));assert.throws(()=>generator({V_H:-1}));});
test('uniformization agrees with a single exponential exit',()=>{const p=propagate([0,0,1,0],{V_H:.2},10);near(p[2],Math.exp(-2));near(p[3],1-Math.exp(-2));near(p.reduce((a,b)=>a+b,0),1);});
test('semigroup, positivity, and immutable inputs',()=>{const pi=Object.freeze([1,0,0,0]),rates=Object.freeze({D_R:.1,R_V:.2,V_R:.05,V_H:.2});const whole=propagate(pi,rates,30),parts=propagate(propagate(pi,rates,10),rates,20);whole.forEach((x,i)=>{assert.ok(x>=0&&x<=1);near(x,parts[i]);});assert.deepEqual(pi,[1,0,0,0]);});
test('backward equation matches an analytical repair-loop scenario',()=>{const result=expectedHandoffMinutes({D_R:.1,R_V:.2,V_R:.05,V_H:.2});[21.25,11.25,6.25,0].forEach((x,i)=>near(result[i],x));assert.throws(()=>expectedHandoffMinutes({D_R:.1}));});
test('invalid inputs and excessive numerical work remain explicit',()=>{assert.throws(()=>propagate([1,1,0,0],{},1));assert.throws(()=>propagate([1,0,0,0],{D_R:1},1e9));assert.throws(()=>waitingProbability(0,1,2));assert.throws(()=>gammaPosterior(1,1,1,-1));});
test('positive priors survive cancellation and unsupported scales reject',()=>{assert.equal(betaPosterior(1,1e-20,1,1).b,1e-20);assert.throws(()=>betaAnyEvent(1e308,1e308,1));assert.throws(()=>betaPosterior(1e6,1,1,1));assert.throws(()=>generator({D_R:1e6,D_V:1e6}));});
test('zero exposure retains the prior only with zero events',()=>{assert.throws(()=>gammaPosterior(1,1,1,0));assert.deepEqual(gammaPosterior(1,60,0,0),{shape:1,rate:60,meanRatePerMinute:1/60});});
test('numerically ill-conditioned absorbing scenarios are explicit',()=>{assert.throws(()=>expectedHandoffMinutes({D_R:1e6,R_D:999999,R_V:1e-6,V_H:1}));});

const unsupportedInputs = [
  {name:'finite overflowing prior scale',operation:()=>betaAnyEvent(1e308,1e308,1)},
  {name:'infinite prior',operation:()=>betaPosterior(Infinity,1,0,0)},
  {name:'prior below supported scale',operation:()=>betaPosterior(1e-101,1,0,0)},
  {name:'posterior above supported scale',operation:()=>betaPosterior(1e6,1,1,1)},
  {name:'positive events with zero exposure',operation:()=>gammaPosterior(1,1,1,0)},
  {name:'aggregate exit rate above supported scale',operation:()=>generator({D_R:1e6,D_V:1e6})},
  {name:'horizon above supported scale',operation:()=>waitingProbability(1,60,1e6+1)},
  {name:'NaN waiting rate',operation:()=>waitingDensity(1,NaN,1)},
  {name:'ill-conditioned absorbing scenario',operation:()=>expectedHandoffMinutes({D_R:1e6,R_D:999999,R_V:1e-6,V_H:1})}
];
for(const {name,operation} of unsupportedInputs){
  test('input boundary: '+name,()=>assert.throws(operation));
}

const rateScenarios = [
  {rate:.01,minutes:5},
  {rate:.2,minutes:0},
  {rate:.2,minutes:10},
  {rate:1,minutes:30}
];
for(const {rate,minutes} of rateScenarios){
  test('analytical configuration: rate='+rate+', minutes='+minutes,()=>{
    const rates=Object.freeze({D_R:rate,R_V:rate,V_H:rate});
    const probabilities=propagate(Object.freeze([0,0,1,0]),rates,minutes);
    const survival=Math.exp(-rate*minutes);
    near(probabilities[2],survival);
    near(probabilities[3],1-survival);
    near(probabilities.reduce((sum,value)=>sum+value,0),1);
    expectedHandoffMinutes(rates).forEach((value,index)=>near(value,(3-index)/rate));
  });
}


const smallPriorScenarios = [
  {a:1e-20,b:1},
  {a:1e-100,b:1e6},
  {a:1e-100,b:1e-100}
];
for(const {a,b} of smallPriorScenarios){
  test('positive one-opportunity probability: a='+a+', b='+b,()=>{
    const actual=betaAnyEvent(a,b,1),expected=a/(a+b);
    assert.ok(actual>0);
    assert.ok(Math.abs(actual/expected-1)<1e-12,'relative probability accuracy');
  });
}

for(const missingIndex of [0,1,2,3]){
  for(const inherited of [false,true]){
    test('probability ownership: missing index='+missingIndex+', inherited='+inherited,()=>{
      const probabilities=Array(4).fill(0);
      probabilities[(missingIndex+1)%4]=1;
      delete probabilities[missingIndex];
      if(inherited){
        const prototype=Object.create(Array.prototype);
        Object.defineProperty(prototype,missingIndex,{value:0});
        Object.setPrototypeOf(probabilities,prototype);
      }
      Object.freeze(probabilities);
      assert.throws(()=>forwardDerivative(probabilities,{V_H:.2}),RangeError);
      assert.throws(()=>propagate(probabilities,{V_H:.2},0),RangeError);
      assert.throws(()=>propagate(probabilities,{V_H:.2},1),RangeError);
    });
  }
}
