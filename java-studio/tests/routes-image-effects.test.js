import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationFromHash,applicationHash} from '../src/applicationRoutes.js';
import {imageFilter,normalizeImageEffects} from '../src/imageEffects.js';
import {makeThumbnail} from '../src/thumbnails.js';
import {normalizeSlide} from '../src/model.js';
test('atelier direct et retour accueil',()=>{for(const id of ['slides','banners','thumbnails'])assert.equal(applicationFromHash(applicationHash(id)),id);assert.equal(applicationFromHash('#/inconnu'),null);assert.equal(applicationHash(null),'#/');});
test('effets et sauvegarde du calque image',()=>{const s=makeThumbnail();s.elements.imageBackground={type:'image',custom:true,name:'Fond',src:'',fit:'cover',effects:{grayscale:50,blur:25,brightness:120,contrast:80,saturate:140}};s.blockKeys.push('imageBackground');s.positions.imageBackground={x:0,y:0,w:1920,h:1080,size:32};s.fragments.imageBackground={order:0,animation:'none'};const saved=normalizeSlide(JSON.parse(JSON.stringify(s)),0);assert.deepEqual(saved.elements.imageBackground.effects,s.elements.imageBackground.effects);assert.equal(saved.elements.textPlaylistLabel.text,'Java');assert.equal(imageFilter(saved.elements.imageBackground.effects),'grayscale(50%) blur(10px) brightness(120%) contrast(80%) saturate(140%)');assert.equal(normalizeImageEffects({blur:200,grayscale:-10}).blur,100);assert.equal(normalizeImageEffects({blur:200,grayscale:-10}).grayscale,0);});
