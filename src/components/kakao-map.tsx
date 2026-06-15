"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type KakaoLatLng = object;

type KakaoMapInstance = {
  relayout: () => void;
  setCenter: (position: KakaoLatLng) => void;
  setLevel: (level: number) => void;
};

type KakaoMarkerInstance = {
  setMap: (map: KakaoMapInstance | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};

type KakaoGeocoderResult = {
  address_name: string;
  x: string;
  y: string;
};

type KakaoPlaceResult = {
  address_name: string;
  place_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoMapsNamespace = {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: {
    map?: KakaoMapInstance;
    position: KakaoLatLng;
  }) => KakaoMarkerInstance;
  load: (callback: () => void) => void;
  services: {
    Geocoder: new () => {
      addressSearch: (
        address: string,
        callback: (result: KakaoGeocoderResult[], status: string) => void,
      ) => void;
    };
    Places: new () => {
      keywordSearch: (
        keyword: string,
        callback: (result: KakaoPlaceResult[], status: string) => void,
      ) => void;
    };
    Status: {
      OK: string;
    };
  };
};

type KakaoNamespace = {
  maps?: KakaoMapsNamespace;
};

type WindowWithKakaoMaps = Window & {
  kakao?: KakaoNamespace;
};

type KakaoMapState = "empty" | "loading" | "ready" | "missing-key" | "not-found" | "error";

type KakaoMapProps = {
  address: string;
  className?: string;
  level?: number;
  markerLabel?: string;
  showExternalLink?: boolean;
};

const mapScriptSelector = 'script[data-kakao-map-sdk="true"]';
const sdkLoadTimeoutMs = 8000;
const geocoderTimeoutMs = 8000;
let kakaoMapSdkPromise: Promise<void> | null = null;

export function KakaoMap({
  address,
  className = "",
  level = 3,
  markerLabel = "위치",
  showExternalLink = true,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markerRef = useRef<KakaoMarkerInstance | null>(null);
  const [state, setState] = useState<KakaoMapState>("empty");
  const normalizedAddress = address.trim();
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";
  const kakaoMapUrl = useMemo(() => {
    if (!normalizedAddress) return "";
    return `https://map.kakao.com/link/search/${encodeURIComponent(normalizedAddress)}`;
  }, [normalizedAddress]);
  const sizeClassName = className || "min-h-[220px]";

  useEffect(() => {
    let cancelled = false;
    let geocoderTimer: number | null = null;

    async function renderMap() {
      if (!normalizedAddress) {
        setState("empty");
        return;
      }

      if (!appKey) {
        setState("missing-key");
        return;
      }

      setState("loading");

      try {
        await loadKakaoMapSdk(appKey);

        const maps = getKakaoMaps();
        if (cancelled || !containerRef.current || !maps) return;

        const geocoder = new maps.services.Geocoder();
        const places = new maps.services.Places();
        const addressCandidates = getAddressCandidates(normalizedAddress);

        geocoderTimer = window.setTimeout(() => {
          if (!cancelled) setState("error");
        }, geocoderTimeoutMs);

        const clearGeocoderTimer = () => {
          if (geocoderTimer) {
            window.clearTimeout(geocoderTimer);
            geocoderTimer = null;
          }
        };

        const renderPosition = (x: string, y: string) => {
          if (cancelled || !containerRef.current) return;

          const lat = Number(y);
          const lng = Number(x);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            setState("not-found");
            return;
          }

          const position = new maps.LatLng(lat, lng);

          if (!mapRef.current) {
            mapRef.current = new maps.Map(containerRef.current, {
              center: position,
              level,
            });
          } else {
            mapRef.current.relayout();
            mapRef.current.setCenter(position);
            mapRef.current.setLevel(level);
          }

          if (!markerRef.current) {
            markerRef.current = new maps.Marker({
              map: mapRef.current,
              position,
            });
          } else {
            markerRef.current.setPosition(position);
            markerRef.current.setMap(mapRef.current);
          }

          setState("ready");
        };

        const searchByKeyword = () => {
          places.keywordSearch(normalizedAddress, (result, status) => {
            clearGeocoderTimer();

            const firstResult = result[0];
            if (status !== maps.services.Status.OK || !firstResult) {
              setState("not-found");
              return;
            }

            renderPosition(firstResult.x, firstResult.y);
          });
        };

        const searchAddress = (index: number) => {
          const candidate = addressCandidates[index];
          if (!candidate) {
            searchByKeyword();
            return;
          }

          geocoder.addressSearch(candidate, (result, status) => {
            const firstResult = result[0];
            if (status === maps.services.Status.OK && firstResult) {
              clearGeocoderTimer();
              renderPosition(firstResult.x, firstResult.y);
              return;
            }

            searchAddress(index + 1);
          });
        };

        searchAddress(0);
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
      if (geocoderTimer) window.clearTimeout(geocoderTimer);
    };
  }, [appKey, level, normalizedAddress]);

  const statusMessage = getMapStatusMessage(state);

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-[#F5E1D3] bg-[#F7F5F3] ${sizeClassName}`}
    >
      <div
        aria-label={`${markerLabel} 지도`}
        className="absolute inset-0"
        ref={containerRef}
      />
      {state !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#F7F5F3]/95 px-6 text-center text-sm font-medium leading-[1.55] text-[#6D7A8A]">
          <div className="flex max-w-[320px] flex-col items-center gap-3">
            <MapPin aria-hidden="true" className="size-7 text-[#FE701E]" />
            <span className="break-keep">{statusMessage}</span>
            {normalizedAddress ? (
              <span className="break-keep text-xs text-[#8A98AA]">
                {normalizedAddress}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {showExternalLink && kakaoMapUrl ? (
        <a
          className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-[#5B3A29] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
          href={kakaoMapUrl}
          rel="noreferrer"
          target="_blank"
        >
          카카오맵
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}

function getMapStatusMessage(state: KakaoMapState) {
  if (state === "loading") return "지도를 불러오는 중이에요";
  if (state === "missing-key") return "카카오 지도 키가 설정되면 지도가 표시돼요";
  if (state === "not-found") return "주소를 지도에서 찾지 못했어요";
  if (state === "error") return "지도를 불러오지 못했어요";
  return "주소를 입력하면 지도가 표시돼요";
}

function getAddressCandidates(address: string) {
  const candidates = [address];
  const roadAddressMatch = address.match(
    /^(.+?(?:대로|로|길)\s*\d+(?:-\d+)?)/,
  );

  if (roadAddressMatch?.[1]) candidates.push(roadAddressMatch[1]);

  return Array.from(new Set(candidates.map((value) => value.trim()).filter(Boolean)));
}

function loadKakaoMapSdk(appKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps can only load in the browser."));
  }

  const currentMaps = getKakaoMaps();
  if (currentMaps?.services?.Geocoder) {
    return new Promise<void>((resolve) => {
      currentMaps.load(resolve);
    });
  }

  if (kakaoMapSdkPromise) return kakaoMapSdkPromise;

  kakaoMapSdkPromise = new Promise<void>((resolve, reject) => {
    const loadTimer = window.setTimeout(() => {
      kakaoMapSdkPromise = null;
      reject(new Error("Kakao Maps SDK load timed out."));
    }, sdkLoadTimeoutMs);
    const finish = (callback: () => void) => {
      window.clearTimeout(loadTimer);
      callback();
    };
    const resolveWhenReady = () => {
      const maps = getKakaoMaps();
      if (!maps) {
        finish(() => reject(new Error("Kakao Maps SDK did not initialize.")));
        return;
      }

      maps.load(() => {
        if (getKakaoMaps()?.services?.Geocoder) {
          finish(resolve);
        } else {
          finish(() =>
            reject(new Error("Kakao Maps services library is not available.")),
          );
        }
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      mapScriptSelector,
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolveWhenReady, { once: true });
      existingScript.addEventListener(
        "error",
        () =>
          finish(() => reject(new Error("Kakao Maps SDK failed to load."))),
        {
          once: true,
        },
      );
      if (getKakaoMaps()) resolveWhenReady();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.dataset.kakaoMapSdk = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false&libraries=services`;
    script.addEventListener("load", resolveWhenReady, { once: true });
    script.addEventListener(
      "error",
      () => {
        kakaoMapSdkPromise = null;
        finish(() => reject(new Error("Kakao Maps SDK failed to load.")));
      },
      { once: true },
    );

    document.head.appendChild(script);
  });

  return kakaoMapSdkPromise;
}

function getKakaoMaps() {
  return (window as WindowWithKakaoMaps).kakao?.maps;
}
