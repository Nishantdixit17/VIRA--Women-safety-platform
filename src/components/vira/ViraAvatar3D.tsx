"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRM } from "@pixiv/three-vrm";
import { Volume2, Eye, Sparkles, Shield, Compass } from "lucide-react";
import { ViraAvatarState } from "@/store/useSafetyStore";
import { playViraVoice } from "@/lib/audio/vira-voice";

export interface ViraAvatar3DProps {
  avatarState: ViraAvatarState;
  speakingAmplitude?: number;
  className?: string;
  vrmUrl?: string;
  onQuickSpeak?: () => void;
}

export default function ViraAvatar3D({
  avatarState,
  speakingAmplitude = 0.65,
  className = "h-56 w-full",
  vrmUrl,
  onQuickSpeak,
}: ViraAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ViraAvatarState>(avatarState);
  const ampRef = useRef<number>(speakingAmplitude);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragAngleRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastDragXRef = useRef<number>(0);

  const [webglReady, setWebglReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<"portrait" | "closeup" | "wide">(
    "portrait"
  );
  const cameraModeRef = useRef<"portrait" | "closeup" | "wide">("portrait");
  const [localSpeaking, setLocalSpeaking] = useState(false);

  useEffect(() => {
    stateRef.current = localSpeaking ? "speaking" : avatarState;
  }, [avatarState, localSpeaking]);

  useEffect(() => {
    ampRef.current = speakingAmplitude;
  }, [speakingAmplitude]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  const handleQuickVoiceTest = () => {
    if (onQuickSpeak) {
      onQuickSpeak();
      return;
    }
    setLocalSpeaking(true);
    playViraVoice(
      "Hi, I am Vira, your live predictive safety guide for New Delhi. I monitor well-lit roads, safe stops, and emergency help all across your route.",
      {
        isDistress: avatarState === "distress",
        lang: "en-IN",
        pitch: 1.16,
        rate: 0.95,
        onStart: () => setLocalSpeaking(true),
        onEnd: () => setLocalSpeaking(false),
        onError: () => setLocalSpeaking(false),
      }
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const initWidth = container.clientWidth || 360;
    const initHeight = container.clientHeight || 240;
    renderer.setSize(initWidth, initHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      32,
      initWidth / Math.max(initHeight, 1),
      0.1,
      25
    );
    camera.position.set(0, 0.22, 2.05);

    // =========================================================================
    // 1. Cinematic 4-Point Studio Lighting
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0xfff6f8, 1.4);
    scene.add(ambientLight);

    // Warm Key Light (Upper-Right 45deg)
    const keyLight = new THREE.DirectionalLight(0xfff8f4, 1.45);
    keyLight.position.set(1.8, 2.8, 2.6);
    scene.add(keyLight);

    // Luminous Rose Rim Light (Back-Left: Highlights hair, jawline & shoulder contour)
    const rimLight = new THREE.PointLight(0xff7da7, 1.7, 9);
    rimLight.position.set(-1.8, 1.6, -0.9);
    scene.add(rimLight);

    // Soft Lavender-Blush Fill Light (Lower-Left)
    const fillLight = new THREE.PointLight(0xf8d7e3, 0.8, 8);
    fillLight.position.set(-1.4, -0.5, 1.8);
    scene.add(fillLight);

    // Under-Chin Warm Bounce Light (Smooths under-jaw shadows)
    const bounceLight = new THREE.PointLight(0xffebee, 0.55, 5);
    bounceLight.position.set(0, -1.2, 1.3);
    scene.add(bounceLight);

    // =========================================================================
    // 2. Realistic Humanistic Material Palette
    // =========================================================================
    // Lifelike warm skin with natural peach/rose subsurface tone
    const matSkin = new THREE.MeshStandardMaterial({
      color: 0xffdfd7,
      roughness: 0.50,
      metalness: 0.02,
    });

    // Dark espresso hair with silky specular sheen
    const matHair = new THREE.MeshStandardMaterial({
      color: 0x1f1418,
      roughness: 0.36,
      metalness: 0.12,
    });

    // Executive tailored blazer in rich Vira brand crimson
    const matBlazer = new THREE.MeshStandardMaterial({
      color: 0xd93667,
      roughness: 0.42,
      metalness: 0.08,
    });

    // Darker blazer lapel trim for tailored depth
    const matLapel = new THREE.MeshStandardMaterial({
      color: 0x9e1b43,
      roughness: 0.35,
      metalness: 0.10,
    });

    // Crisp white inner shirt collar
    const matCollar = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.02,
    });

    // Polished rose-gold metallic hardware (hair ring, brooch, headset, earrings)
    const matRoseGold = new THREE.MeshStandardMaterial({
      color: 0xf5b596,
      roughness: 0.18,
      metalness: 0.85,
    });

    // Sclera: Natural eyeball white with gentle warm tint
    const matEyeWhite = new THREE.MeshStandardMaterial({
      color: 0xfafafc,
      roughness: 0.22,
      metalness: 0.0,
    });

    // Outer Limbal Ring (creates realistic eye depth)
    const matLimbal = new THREE.MeshBasicMaterial({ color: 0x24141d });

    // Radiant Mocha / Amber Iris Core
    const matIris = new THREE.MeshBasicMaterial({ color: 0x76384a });

    // Deep Pupil
    const matPupil = new THREE.MeshBasicMaterial({ color: 0x0f070b });

    // Twin Twinkling Specular Catchlights
    const matCatchlight1 = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matCatchlight2 = new THREE.MeshBasicMaterial({ color: 0xfff0f5 });

    // Tear Duct / Inner Canthus
    const matCanthus = new THREE.MeshBasicMaterial({ color: 0xe88a9e });

    // Eyelashes & Eyeliner
    const matEyelash = new THREE.MeshBasicMaterial({ color: 0x180b11 });

    // Soft Blended Blush on Cheeks
    const matCheek = new THREE.MeshBasicMaterial({
      color: 0xe64a7b,
      transparent: true,
      opacity: 0.24,
    });

    // Satin Curving Lips with Hydrated Gloss
    const matLip = new THREE.MeshStandardMaterial({
      color: 0xd9446d,
      roughness: 0.22,
      metalness: 0.04,
    });

    const matInnerMouth = new THREE.MeshBasicMaterial({ color: 0x241117 });

    // Sleek Headset Tech Wire
    const matHeadset = new THREE.MeshStandardMaterial({
      color: 0x2b1b21,
      roughness: 0.25,
      metalness: 0.65,
    });

    // Active Microphone LED Indicator Jewel
    const matMicLed = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    // Holographic Safety Halo Aura Materials
    const matHaloOuter = new THREE.MeshBasicMaterial({
      color: 0xf1d4dc,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    const matHaloInner = new THREE.MeshBasicMaterial({
      color: 0xe64a7b,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
    });

    const matHaloNodes = new THREE.MeshBasicMaterial({
      color: 0xff6b97,
      transparent: true,
      opacity: 0.75,
    });

    // =========================================================================
    // 3. Build Vira Humanistic 3D Character
    // =========================================================================
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, -0.34, 0);
    scene.add(rootGroup);

    // Floating Ambient Sparkle Particles in Background
    const particleCount = 32;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 3.4;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2.4 + 0.2;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 1.6 - 0.5;
    }
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const matParticles = new THREE.PointsMaterial({
      color: 0xfcb0c7,
      size: 0.034,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, matParticles);
    scene.add(particleSystem);

    // --- Holographic Aura Rings ---
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.52, -0.42);
    rootGroup.add(haloGroup);

    const auraOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.77, 64),
      matHaloOuter
    );
    haloGroup.add(auraOuter);

    const auraInner = new THREE.Mesh(
      new THREE.RingGeometry(0.61, 0.67, 64),
      matHaloInner
    );
    haloGroup.add(auraInner);

    // Orbital Satellite Nodes on Halo Ring
    const nodeCount = 4;
    const orbitNodes: THREE.Mesh[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 12),
        matHaloNodes
      );
      const angle = (i / nodeCount) * Math.PI * 2;
      node.position.set(Math.cos(angle) * 0.74, Math.sin(angle) * 0.74, 0.01);
      haloGroup.add(node);
      orbitNodes.push(node);
    }

    // --- Torso & Executive Tailored Blazer ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, -0.32, 0);
    rootGroup.add(torsoGroup);

    // Shoulders
    const shoulders = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.40, 0.44, 20, 32),
      matBlazer
    );
    torsoGroup.add(shoulders);

    // Left and Right Blazer Lapel Folds
    const leftLapel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.32, 0.06),
      matLapel
    );
    leftLapel.position.set(-0.13, 0.04, 0.24);
    leftLapel.rotation.set(0.1, 0.15, -0.22);
    torsoGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.32, 0.06),
      matLapel
    );
    rightLapel.position.set(0.13, 0.04, 0.24);
    rightLapel.rotation.set(0.1, -0.15, 0.22);
    torsoGroup.add(rightLapel);

    // White V-Neck Silk Shirt Collar
    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.2, 0.14),
      matCollar
    );
    collar.position.set(0, 0.12, 0.22);
    torsoGroup.add(collar);

    // Sculpted Clavicles (Collarbones) Ridge
    const leftClavicle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.18, 8, 12),
      matSkin
    );
    leftClavicle.position.set(-0.12, 0.08, 0.24);
    leftClavicle.rotation.set(0.05, 0.1, -0.32);
    torsoGroup.add(leftClavicle);

    const rightClavicle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.18, 8, 12),
      matSkin
    );
    rightClavicle.position.set(0.12, 0.08, 0.24);
    rightClavicle.rotation.set(0.05, -0.1, 0.32);
    torsoGroup.add(rightClavicle);

    // Golden "V" Safety Brooch on Left Lapel
    const broochBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.01, 16),
      matRoseGold
    );
    broochBase.rotation.x = Math.PI / 2;
    broochBase.position.set(-0.21, 0.05, 0.26);
    torsoGroup.add(broochBase);

    // Conversational Gesture Hands
    const leftHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.088, 22, 22),
      matSkin
    );
    leftHand.position.set(-0.47, -0.14, 0.29);
    rootGroup.add(leftHand);

    const rightHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.088, 22, 22),
      matSkin
    );
    rightHand.position.set(0.47, -0.14, 0.29);
    rootGroup.add(rightHand);

    // Slender Feminine Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.108, 0.128, 0.26, 32),
      matSkin
    );
    neck.position.set(0, 0.14, 0.02);
    rootGroup.add(neck);

    // --- Head Group ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0.04);
    rootGroup.add(headGroup);

    // 1. Contoured Cranium (Anatomically Proportioned Skull)
    const craniumMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.41, 48, 48),
      matSkin
    );
    craniumMesh.scale.set(1.0, 1.05, 1.06);
    headGroup.add(craniumMesh);

    // 2. Tapered Feminine Jaw & Chin Contour
    const jawMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.075, 0.28, 32),
      matSkin
    );
    jawMesh.position.set(0, -0.21, 0.09);
    jawMesh.rotation.set(0.16, 0, 0);
    headGroup.add(jawMesh);

    // Soft Rounded Chin Tip
    const chinTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 20, 20),
      matSkin
    );
    chinTip.position.set(0, -0.32, 0.18);
    headGroup.add(chinTip);

    // 3. Subtle Sculpted Cheekbone Fullness
    const leftCheekPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 20),
      matSkin
    );
    leftCheekPad.position.set(-0.21, -0.02, 0.29);
    leftCheekPad.scale.set(0.8, 0.9, 0.6);
    headGroup.add(leftCheekPad);

    const rightCheekPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 20, 20),
      matSkin
    );
    rightCheekPad.position.set(0.21, -0.02, 0.29);
    rightCheekPad.scale.set(0.8, 0.9, 0.6);
    headGroup.add(rightCheekPad);

    // 4. Anatomical Ears with Rose-Gold Stud Earrings
    const leftEar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.038, 0.12, 16),
      matSkin
    );
    leftEar.position.set(-0.41, 0.04, -0.04);
    leftEar.rotation.set(0.2, 0, 0.15);
    headGroup.add(leftEar);

    const leftEarring = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 12, 12),
      matRoseGold
    );
    leftEarring.position.set(-0.415, -0.02, -0.03);
    headGroup.add(leftEarring);

    const rightEar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.038, 0.12, 16),
      matSkin
    );
    rightEar.position.set(0.41, 0.04, -0.04);
    rightEar.rotation.set(0.2, 0, -0.15);
    headGroup.add(rightEar);

    const rightEarring = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 12, 12),
      matRoseGold
    );
    rightEarring.position.set(0.415, -0.02, -0.03);
    headGroup.add(rightEarring);

    // --- Silky Layered Hairstyling ---
    // Voluminous Hair Crown
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.452, 44, 44),
      matHair
    );
    hairCrown.position.set(0, 0.11, -0.06);
    headGroup.add(hairCrown);

    // High French Twist Bun
    const hairBun = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 32, 32),
      matHair
    );
    hairBun.position.set(0, 0.51, -0.19);
    headGroup.add(hairBun);

    // Rose-Gold Clasp Ring around Bun
    const hairRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.024, 16, 36),
      matRoseGold
    );
    hairRing.rotation.x = Math.PI / 2.3;
    hairRing.position.set(0, 0.45, -0.16);
    headGroup.add(hairRing);

    // Sweeping Side Bangs (Natural hair flow across forehead)
    const bangPrimary = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.38, 16, 20),
      matHair
    );
    bangPrimary.position.set(-0.11, 0.28, 0.33);
    bangPrimary.rotation.set(0.35, 0.25, -0.42);
    headGroup.add(bangPrimary);

    const bangSecondary = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.32, 16, 20),
      matHair
    );
    bangSecondary.position.set(0.18, 0.29, 0.32);
    bangSecondary.rotation.set(0.25, -0.2, 0.38);
    headGroup.add(bangSecondary);

    // Elegant Face-Framing Tresses (Left and Right)
    const leftLock = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.10, 0.48, 16, 20),
      matHair
    );
    leftLock.position.set(-0.37, -0.16, 0.06);
    leftLock.rotation.set(0.08, 0.05, 0.14);
    headGroup.add(leftLock);

    const rightLock = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.10, 0.48, 16, 20),
      matHair
    );
    rightLock.position.set(0.37, -0.16, 0.06);
    rightLock.rotation.set(0.08, -0.05, -0.14);
    headGroup.add(rightLock);

    // --- Sleek Concierge Headset & Status Mic ---
    const headsetBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.445, 0.012, 12, 48, Math.PI),
      matRoseGold
    );
    headsetBand.position.set(0, 0.12, 0.02);
    headsetBand.rotation.x = -Math.PI / 2 + 0.15;
    headGroup.add(headsetBand);

    const earpiece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.045, 20),
      matRoseGold
    );
    earpiece.rotation.z = Math.PI / 2;
    earpiece.position.set(0.43, 0.02, 0.07);
    headGroup.add(earpiece);

    const micBoom = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.24, 8, 14),
      matHeadset
    );
    micBoom.position.set(0.32, -0.1, 0.29);
    micBoom.rotation.set(0.62, 0.38, 0.82);
    headGroup.add(micBoom);

    // Glowing LED Status Tip on Mic
    const micLedTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 14, 14),
      matMicLed
    );
    micLedTip.position.set(0.2, -0.19, 0.41);
    headGroup.add(micLedTip);

    // Soft Cheek Blush Circles
    const leftCheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.068, 24),
      matCheek
    );
    leftCheek.position.set(-0.23, -0.025, 0.374);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.068, 24),
      matCheek
    );
    rightCheek.position.set(0.23, -0.025, 0.374);
    headGroup.add(rightCheek);

    // Naturally Arched Eyebrows
    const leftBrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.138, 0.022, 0.020),
      matHair
    );
    leftBrow.position.set(-0.165, 0.192, 0.386);
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.138, 0.022, 0.020),
      matHair
    );
    rightBrow.position.set(0.165, 0.192, 0.386);
    headGroup.add(rightBrow);

    // --- Eyes (Orbital Socket Depth + Twin Catchlights + Eyelashes) ---
    // Left Eye
    const leftEyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.066, 26, 26),
      matEyeWhite
    );
    leftEyeWhite.position.set(-0.165, 0.082, 0.376);
    headGroup.add(leftEyeWhite);

    const leftLimbal = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 22, 22),
      matLimbal
    );
    leftLimbal.position.set(-0.165, 0.082, 0.418);
    headGroup.add(leftLimbal);

    const leftIris = new THREE.Mesh(
      new THREE.SphereGeometry(0.039, 22, 22),
      matIris
    );
    leftIris.position.set(-0.165, 0.082, 0.426);
    headGroup.add(leftIris);

    const leftPupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 20, 20),
      matPupil
    );
    leftPupil.position.set(-0.165, 0.082, 0.441);
    headGroup.add(leftPupil);

    const leftCatchlight1 = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 14),
      matCatchlight1
    );
    leftCatchlight1.position.set(-0.152, 0.098, 0.463);
    headGroup.add(leftCatchlight1);

    const leftCatchlight2 = new THREE.Mesh(
      new THREE.CircleGeometry(0.006, 10),
      matCatchlight2
    );
    leftCatchlight2.position.set(-0.174, 0.071, 0.463);
    headGroup.add(leftCatchlight2);

    // Left Inner Tear Duct
    const leftCanthus = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 10, 10),
      matCanthus
    );
    leftCanthus.position.set(-0.106, 0.078, 0.422);
    headGroup.add(leftCanthus);

    // Left Upper Eyelash Wing
    const leftLash = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.011, 0.12, 8, 12),
      matEyelash
    );
    leftLash.position.set(-0.165, 0.118, 0.442);
    leftLash.rotation.set(0, 0, 0.18);
    headGroup.add(leftLash);

    const leftEyelid = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.11, 0.032),
      matSkin
    );
    leftEyelid.position.set(-0.165, 0.116, 0.435);
    leftEyelid.scale.set(1, 0.08, 1);
    headGroup.add(leftEyelid);

    // Right Eye
    const rightEyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.066, 26, 26),
      matEyeWhite
    );
    rightEyeWhite.position.set(0.165, 0.082, 0.376);
    headGroup.add(rightEyeWhite);

    const rightLimbal = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 22, 22),
      matLimbal
    );
    rightLimbal.position.set(0.165, 0.082, 0.418);
    headGroup.add(rightLimbal);

    const rightIris = new THREE.Mesh(
      new THREE.SphereGeometry(0.039, 22, 22),
      matIris
    );
    rightIris.position.set(0.165, 0.082, 0.426);
    headGroup.add(rightIris);

    const rightPupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 20, 20),
      matPupil
    );
    rightPupil.position.set(0.165, 0.082, 0.441);
    headGroup.add(rightPupil);

    const rightCatchlight1 = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 14),
      matCatchlight1
    );
    rightCatchlight1.position.set(0.178, 0.098, 0.463);
    headGroup.add(rightCatchlight1);

    const rightCatchlight2 = new THREE.Mesh(
      new THREE.CircleGeometry(0.006, 10),
      matCatchlight2
    );
    rightCatchlight2.position.set(0.156, 0.071, 0.463);
    headGroup.add(rightCatchlight2);

    // Right Inner Tear Duct
    const rightCanthus = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 10, 10),
      matCanthus
    );
    rightCanthus.position.set(0.106, 0.078, 0.422);
    headGroup.add(rightCanthus);

    // Right Upper Eyelash Wing
    const rightLash = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.011, 0.12, 8, 12),
      matEyelash
    );
    rightLash.position.set(0.165, 0.118, 0.442);
    rightLash.rotation.set(0, 0, -0.18);
    headGroup.add(rightLash);

    const rightEyelid = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.11, 0.032),
      matSkin
    );
    rightEyelid.position.set(0.165, 0.116, 0.435);
    rightEyelid.scale.set(1, 0.08, 1);
    headGroup.add(rightEyelid);

    // --- Anatomically Sculpted Nose (Bridge + Lobule + Nostrils) ---
    // Slender Nasal Bridge
    const noseBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.024, 0.14, 16),
      matSkin
    );
    noseBridge.position.set(0, 0.06, 0.424);
    noseBridge.rotation.set(0.24, 0, 0);
    headGroup.add(noseBridge);

    // Soft Lobule Tip
    const noseTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 20, 20),
      matSkin
    );
    noseTip.position.set(0, -0.012, 0.432);
    headGroup.add(noseTip);

    // Left and Right Nostril Flares
    const leftNostril = new THREE.Mesh(
      new THREE.SphereGeometry(0.020, 14, 14),
      matSkin
    );
    leftNostril.position.set(-0.032, -0.024, 0.420);
    headGroup.add(leftNostril);

    const rightNostril = new THREE.Mesh(
      new THREE.SphereGeometry(0.020, 14, 14),
      matSkin
    );
    rightNostril.position.set(0.032, -0.024, 0.420);
    headGroup.add(rightNostril);

    // --- Humanistic Sculpted Lips with Cupid's Bow & Philtrum ---
    // Philtrum Column
    const philtrum = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.05, 0.012),
      matSkin
    );
    philtrum.position.set(0, -0.075, 0.420);
    headGroup.add(philtrum);

    // Upper Lip with Double-Peaked Cupid's Bow
    const upperLipLeft = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.024, 0.05, 12, 16),
      matLip
    );
    upperLipLeft.position.set(-0.028, -0.118, 0.412);
    upperLipLeft.rotation.set(0, 0, 0.22);
    headGroup.add(upperLipLeft);

    const upperLipRight = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.024, 0.05, 12, 16),
      matLip
    );
    upperLipRight.position.set(0.028, -0.118, 0.412);
    upperLipRight.rotation.set(0, 0, -0.22);
    headGroup.add(upperLipRight);

    // Fuller Pillowed Lower Lip
    const mouth = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.044, 0.088, 16, 20),
      matLip
    );
    mouth.position.set(0, -0.146, 0.404);
    mouth.scale.set(1, 0.26, 1);
    headGroup.add(mouth);

    const innerMouth = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.030, 0.054, 12, 14),
      matInnerMouth
    );
    innerMouth.position.set(0, -0.146, 0.424);
    innerMouth.scale.set(0.65, 0.06, 1);
    headGroup.add(innerMouth);

    // Optional VRM Loader Support
    let activeVrm: VRM | null = null;
    if (vrmUrl) {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.load(
        vrmUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM | undefined;
          if (vrm) {
            activeVrm = vrm;
            rootGroup.visible = false;
            vrm.scene.position.set(0, -1.1, 0);
            scene.add(vrm.scene);
          }
        },
        undefined,
        () => {}
      );
    }

    // Interactive Drag to Rotate & Track Mouse
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = -(e.clientY / Math.max(window.innerHeight, 1)) * 2 + 1;
      pointerRef.current = { x: nx, y: ny };

      if (isDraggingRef.current) {
        const dx = e.clientX - lastDragXRef.current;
        lastDragXRef.current = e.clientX;
        dragAngleRef.current = THREE.MathUtils.clamp(
          dragAngleRef.current + dx * 0.008,
          -0.75,
          0.75
        );
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastDragXRef.current = e.clientX;
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Touch Support for Mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDraggingRef.current = true;
        lastDragXRef.current = e.touches[0].clientX;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        const dx = e.touches[0].clientX - lastDragXRef.current;
        lastDragXRef.current = e.touches[0].clientX;
        dragAngleRef.current = THREE.MathUtils.clamp(
          dragAngleRef.current + dx * 0.009,
          -0.75,
          0.75
        );
      }
    };
    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 240;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    setWebglReady(true);

    // =========================================================================
    // 4. Fluid Procedural Animation Loop
    // =========================================================================
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = clock.getElapsedTime();
      const currentState = stateRef.current;
      const currentAmp = ampRef.current;
      const ptr = pointerRef.current;

      // Camera view transition
      const targetCamZ =
        cameraModeRef.current === "closeup"
          ? 1.58
          : cameraModeRef.current === "wide"
          ? 2.38
          : 2.02;
      const targetCamY =
        cameraModeRef.current === "closeup"
          ? 0.28
          : cameraModeRef.current === "wide"
          ? 0.15
          : 0.22;
      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        targetCamZ,
        0.08
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        targetCamY,
        0.08
      );

      // Status LED color shifts
      if (currentState === "distress") {
        matMicLed.color.setHex(0xef4444);
        matMicLed.emissive.setHex(0xef4444);
        matMicLed.emissiveIntensity = 1.0 + Math.sin(t * 8) * 0.6;
        matBlazer.color.setHex(0xbc1f3d);
        matHaloInner.color.setHex(0xef4444);
      } else if (currentState === "listening") {
        matMicLed.color.setHex(0x8b5cf6);
        matMicLed.emissive.setHex(0x8b5cf6);
        matMicLed.emissiveIntensity = 0.9 + Math.sin(t * 6) * 0.4;
        matBlazer.color.setHex(0xd93667);
        matHaloInner.color.setHex(0x8b5cf6);
      } else if (currentState === "speaking") {
        matMicLed.color.setHex(0xe64a7b);
        matMicLed.emissive.setHex(0xe64a7b);
        matMicLed.emissiveIntensity = 1.1 + Math.sin(t * 12) * 0.5;
        matBlazer.color.setHex(0xd93667);
        matHaloInner.color.setHex(0xe64a7b);
      } else {
        matMicLed.color.setHex(0x10b981);
        matMicLed.emissive.setHex(0x10b981);
        matMicLed.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.25;
        matBlazer.color.setHex(0xd93667);
        matHaloInner.color.setHex(0xe64a7b);
      }

      // Natural Blinking with slight randomness (every ~3.8s)
      const blinkCycle = t % 3.8;
      const isBlinking = blinkCycle > 3.62 && blinkCycle < 3.76;

      if (activeVrm) {
        if (activeVrm.expressionManager) {
          activeVrm.expressionManager.setValue("blink", isBlinking ? 1.0 : 0.0);
          if (currentState === "speaking") {
            activeVrm.expressionManager.setValue(
              "aa",
              Math.abs(Math.sin(t * 13)) * Math.max(0.35, currentAmp)
            );
            activeVrm.expressionManager.setValue(
              "ih",
              Math.abs(Math.cos(t * 9.5)) * 0.45
            );
          } else {
            activeVrm.expressionManager.setValue("aa", 0);
            activeVrm.expressionManager.setValue("ih", 0);
          }
        }
        activeVrm.update(delta);
        renderer.render(scene, camera);
        return;
      }

      // 1. Organic Breathing & Subtle Body Sway
      const breathSpeed = currentState === "distress" ? 1.5 : 2.0;
      const breathDepth = currentState === "distress" ? 0.014 : 0.022;
      rootGroup.position.y = Math.sin(t * breathSpeed) * breathDepth - 0.34;
      rootGroup.rotation.y = THREE.MathUtils.lerp(
        rootGroup.rotation.y,
        dragAngleRef.current,
        0.12
      );
      rootGroup.rotation.z =
        currentState === "distress" ? 0 : Math.sin(t * 0.85) * 0.02;

      if (!isDraggingRef.current) {
        dragAngleRef.current = THREE.MathUtils.lerp(
          dragAngleRef.current,
          0,
          0.025
        );
      }

      const scaleBreath = 1 + Math.sin(t * breathSpeed) * 0.016;
      shoulders.scale.set(1, scaleBreath, 1);

      // 2. Natural Hand Gestures
      if (currentState === "speaking") {
        leftHand.position.y = -0.12 + Math.sin(t * 5.0) * 0.05;
        rightHand.position.y = -0.12 + Math.cos(t * 4.6) * 0.05;
        leftHand.position.x = -0.44 + Math.sin(t * 3.2) * 0.03;
        rightHand.position.x = 0.44 - Math.cos(t * 3.2) * 0.03;
      } else if (currentState === "listening") {
        rightHand.position.set(0.36, 0.01, 0.35);
        leftHand.position.set(-0.47, -0.15, 0.27);
      } else {
        leftHand.position.y = THREE.MathUtils.lerp(
          leftHand.position.y,
          -0.15 + Math.sin(t * 1.8) * 0.012,
          0.1
        );
        rightHand.position.y = THREE.MathUtils.lerp(
          rightHand.position.y,
          -0.15 + Math.cos(t * 1.8) * 0.012,
          0.1
        );
      }

      // 3. Aura & Orbital Satellites Rotation
      haloGroup.rotation.z = t * 0.35;
      const pulse =
        currentState === "listening" || currentState === "speaking"
          ? 1 + Math.sin(t * 5.2) * 0.06
          : 1 + Math.sin(t * 2) * 0.025;
      auraOuter.scale.set(pulse, pulse, 1);

      // Rotate Background Floating Particles
      particleSystem.rotation.y = t * 0.04;

      // 4. Smooth Responsive Head Tilting & Tracking
      const targetRotY = THREE.MathUtils.clamp(ptr.x * 0.28, -0.28, 0.28);
      let targetRotX = THREE.MathUtils.clamp(-ptr.y * 0.16, -0.16, 0.16);
      let targetRotZ = 0;

      if (currentState === "listening") {
        targetRotZ = 0.09;
        targetRotX += 0.04;
      } else if (currentState === "speaking") {
        targetRotX += Math.sin(t * 6.2) * 0.04;
        targetRotZ = Math.sin(t * 2.4) * 0.028;
      } else if (currentState === "distress") {
        targetRotZ = -0.04;
        targetRotX = 0.03;
      }

      headGroup.rotation.y = THREE.MathUtils.lerp(
        headGroup.rotation.y,
        targetRotY,
        0.08
      );
      headGroup.rotation.x = THREE.MathUtils.lerp(
        headGroup.rotation.x,
        targetRotX,
        0.08
      );
      headGroup.rotation.z = THREE.MathUtils.lerp(
        headGroup.rotation.z,
        targetRotZ,
        0.08
      );

      // 5. Lifelike Eye Saccades & Smooth Tracking
      const saccadeX = Math.sin(Math.floor(t * 0.4) * 12.3) * 0.008;
      const saccadeY = Math.cos(Math.floor(t * 0.4) * 7.7) * 0.006;
      const px = THREE.MathUtils.clamp(ptr.x * 0.028 + saccadeX, -0.032, 0.032);
      const py = THREE.MathUtils.clamp(
        ptr.y * 0.02 + saccadeY,
        -0.022,
        0.022
      );

      leftLimbal.position.x = -0.165 + px;
      leftLimbal.position.y = 0.082 + py;
      leftIris.position.x = -0.165 + px;
      leftIris.position.y = 0.082 + py;
      leftPupil.position.x = -0.165 + px;
      leftPupil.position.y = 0.082 + py;

      rightLimbal.position.x = 0.165 + px;
      rightLimbal.position.y = 0.082 + py;
      rightIris.position.x = 0.165 + px;
      rightIris.position.y = 0.082 + py;
      rightPupil.position.x = 0.165 + px;
      rightPupil.position.y = 0.082 + py;

      // Eyelid Blinking
      const lidScaleY = isBlinking ? 1 : 0.08;
      leftEyelid.scale.y = THREE.MathUtils.lerp(
        leftEyelid.scale.y,
        lidScaleY,
        0.4
      );
      rightEyelid.scale.y = THREE.MathUtils.lerp(
        rightEyelid.scale.y,
        lidScaleY,
        0.4
      );

      // 6. Fluid Lip Visemes & Natural Speaking Shapes
      if (currentState === "speaking") {
        const openWave =
          0.34 +
          Math.abs(Math.sin(t * 13.5)) * 0.85 * Math.max(0.4, currentAmp) +
          Math.abs(Math.cos(t * 9.2)) * 0.32;
        const widthWave = 0.9 + Math.sin(t * 10.2) * 0.15;
        mouth.scale.y = THREE.MathUtils.lerp(mouth.scale.y, openWave, 0.35);
        mouth.scale.x = THREE.MathUtils.lerp(mouth.scale.x, widthWave, 0.28);
        innerMouth.scale.y = THREE.MathUtils.lerp(
          innerMouth.scale.y,
          Math.max(0.14, openWave * 0.76),
          0.35
        );
      } else if (currentState === "distress") {
        mouth.scale.set(0.85, 0.28, 1);
        innerMouth.scale.set(0.6, 0.05, 1);
      } else {
        mouth.scale.set(1, 0.26, 1);
        innerMouth.scale.set(0.65, 0.06, 1);
      }

      // 7. Eyebrow Modulation
      const browRot =
        currentState === "distress"
          ? 0.18
          : currentState === "listening"
          ? 0.08
          : 0.02;
      leftBrow.rotation.z = THREE.MathUtils.lerp(
        leftBrow.rotation.z,
        browRot,
        0.12
      );
      rightBrow.rotation.z = THREE.MathUtils.lerp(
        rightBrow.rotation.z,
        -browRot,
        0.12
      );

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      renderer.dispose();
    };
  }, [vrmUrl]);

  const effectiveState = localSpeaking ? "speaking" : avatarState;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-card bg-gradient-to-b from-[#2B1B21]/95 via-[#3B252E]/90 to-[#2B1B21] border border-brand-pink/30 shadow-elevated select-none ${className}`}
    >
      {/* Subtle radial ambient spotlight behind model */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(230, 74, 123, 0.22) 0%, rgba(43, 27, 33, 0) 70%)",
        }}
      />

      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing relative z-10"
        title="Click and drag to rotate Vira in 3D"
      />

      {!webglReady && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-surface-white/70 bg-ink/70 z-20">
          Starting Vira 3D Companion...
        </div>
      )}

      {/* Top-Left Live Status Badge */}
      <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-ink/80 backdrop-blur-md border border-brand-pink/40 text-[11px] font-bold text-surface-white flex items-center gap-2 shadow-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            effectiveState === "distress"
              ? "bg-danger-red animate-ping"
              : effectiveState === "listening"
              ? "bg-purple-400 animate-pulse"
              : effectiveState === "speaking"
              ? "bg-brand-pink animate-pulse"
              : "bg-emerald-400"
          }`}
        />
        <span>
          {effectiveState === "speaking"
            ? "Vira Speaking..."
            : effectiveState === "listening"
            ? "Listening to You..."
            : effectiveState === "distress"
            ? "Emergency Support Mode"
            : "Vira 3D · AI Concierge"}
        </span>
      </div>

      {/* Top-Right Camera Angle Switcher */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-ink/80 backdrop-blur-md p-1 rounded-full border border-brand-pink/30 shadow-sm">
        {(
          [
            { id: "closeup", label: "Face" },
            { id: "portrait", label: "3D View" },
            { id: "wide", label: "Full" },
          ] as const
        ).map((cam) => (
          <button
            key={cam.id}
            type="button"
            onClick={() => setCameraMode(cam.id)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              cameraMode === cam.id
                ? "bg-brand-pink text-surface-white shadow-sm"
                : "text-surface-white/70 hover:text-surface-white"
            }`}
          >
            {cam.label}
          </button>
        ))}
      </div>

      {/* Bottom Interactive Controls */}
      <div className="absolute bottom-2.5 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
        {/* Audio Waveform Indicator */}
        <div className="px-2.5 py-1 rounded-full bg-ink/80 backdrop-blur-md border border-brand-pink/30 flex items-center gap-1 shadow-sm">
          {[0, 1, 2, 3, 4, 5].map((bar) => (
            <span
              key={bar}
              className={`w-1 rounded-full transition-all duration-150 ${
                effectiveState === "speaking" || effectiveState === "listening"
                  ? "bg-brand-pink animate-pulse"
                  : "bg-surface-white/30"
              }`}
              style={{
                height:
                  effectiveState === "speaking"
                    ? `${8 + ((bar * 5) % 10)}px`
                    : effectiveState === "listening"
                    ? "10px"
                    : "5px",
              }}
            />
          ))}
          <span className="text-[10px] font-medium text-surface-white/80 ml-1.5 flex items-center gap-1">
            <Eye className="w-2.5 h-2.5 text-brand-pink" />
            <span>360° Drag</span>
          </span>
        </div>

        {/* 1-Tap Hear Vira Voice Button */}
        <button
          type="button"
          onClick={handleQuickVoiceTest}
          className="px-3 py-1 rounded-full bg-brand-pink text-surface-white text-[11px] font-bold flex items-center gap-1.5 shadow-elevated hover:bg-brand-pink/90 active:scale-95 transition-all"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Hear Vira (Female Voice)</span>
        </button>
      </div>
    </div>
  );
}
