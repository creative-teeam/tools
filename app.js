// =========================
// Google Maps 関連
// =========================
let map;
let markers = [];
let directionsService;
let directionsRenderer;
let placesService;

// 初期化（index.html の callback=initMap と連動）
function initMap() {
  const defaultCenter = { lat: 35.681236, lng: 139.767125 }; // 東京駅付近

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 13,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });
  placesService = new google.maps.places.PlacesService(map);

  attachEventHandlers();
}

// =========================
// イベントハンドラ設定
// =========================
function attachEventHandlers() {
  document
    .getElementById("generateScheduleBtn")
    .addEventListener("click", generateDailySchedule);

  document
    .getElementById("compareHotelsBtn")
    .addEventListener("click", showHotelPlans);

  document
    .getElementById("searchPlacesBtn")
    .addEventListener("click", searchNearbyPlaces);

  document
    .getElementById("calcRouteBtn")
    .addEventListener("click", calculateOptimizedRoute);
}

// =========================
// 1. 一日の行動モデル作成
// =========================
function generateDailySchedule() {
  const startTime = document.getElementById("startTime").value || "09:00";
  const endTime = document.getElementById("endTime").value || "20:00";
  const spotsInput = document.getElementById("spotsInput").value.trim();

  const spots = spotsInput
    ? spotsInput.split(",").map((s) => s.trim()).filter(Boolean)
    : ["スポットA", "スポットB", "スポットC"];

  // 時間計算用ヘルパ
  function parseTimeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  function minutesToTimeStr(min) {
    const h = String(Math.floor(min / 60)).padStart(2, "0");
    const m = String(min % 60).padStart(2, "0");
    return `${h}:${m}`;
  }

  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  const totalMinutes = endM - startM;

  if (totalMinutes <= 0) {
    document.getElementById("scheduleResult").textContent =
      "終了時間は開始時間より後にしてください。";
    return;
  }

  // 全体を移動時間・滞在時間にざっくり分ける
  const moveRatio = 0.3; // 30% 移動
  const stayRatio = 0.7; // 70% 滞在
  const moveTotal = totalMinutes * moveRatio;
  const stayTotal = totalMinutes * stayRatio;

  const movePerLeg = moveTotal / (spots.length + 1); // 出発〜1件目＋スポット間＋最後〜戻り
  const stayPerSpot = stayTotal / spots.length;

  let cursorTime = startM;
  let lines = [];

  lines.push(`出発：${minutesToTimeStr(cursorTime)} ホテル／拠点発`);

  // 出発〜最初のスポット
  cursorTime += movePerLeg;
  lines.push(
    `${minutesToTimeStr(cursorTime)} ごろ「${spots[0]}」へ到着・観光開始`
  );

  // 各スポットの滞在＆移動
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];

    // 滞在
    const stayEnd = cursorTime + stayPerSpot;
    lines.push(
      `  滞在：${minutesToTimeStr(cursorTime)} 〜 ${minutesToTimeStr(
        stayEnd
      )}（約${Math.round(stayPerSpot)}分）`
    );
    cursorTime = stayEnd;

    // 次のスポットへの移動 or 帰路
    if (i < spots.length - 1) {
      cursorTime += movePerLeg;
      lines.push(
        `${minutesToTimeStr(cursorTime)} ごろ「${spots[i + 1]}」へ移動・到着`
      );
    } else {
      cursorTime += movePerLeg;
      lines.push(
        `${minutesToTimeStr(cursorTime)} ごろ ホテル／拠点へ戻る（行程終了）`
      );
    }
  }

  document.getElementById("scheduleResult").textContent = lines.join("\n");
}

// =========================
// 2. ホテルプラン比較（ダミーデータ）
// 実運用ではホテル検索APIに置き換え
// =========================
function showHotelPlans() {
  const city = document.getElementById("hotelCity").value.trim() || "東京";

  // ダミーデータ
  const dummyHotels = [
    {
      name: `${city} セントラルホテル`,
      price: 12000,
      rating: 4.3,
      distance: "駅徒歩3分",
    },
    {
      name: `${city} ビジネスイン`,
      price: 8000,
      rating: 3.9,
      distance: "駅徒歩6分",
    },
    {
      name: `${city} ラグジュアリーホテル`,
      price: 22000,
      rating: 4.7,
      distance: "駅直結",
    },
  ];

  const tbody = document.querySelector("#hotelTable tbody");
  tbody.innerHTML = "";

  dummyHotels.forEach((hotel) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = hotel.name;

    const priceTd = document.createElement("td");
    priceTd.textContent = `${hotel.price.toLocaleString()}円`;

    const ratingTd = document.createElement("td");
    ratingTd.textContent = hotel.rating.toFixed(1);

    const distTd = document.createElement("td");
    distTd.textContent = hotel.distance;

    tr.appendChild(nameTd);
    tr.appendChild(priceTd);
    tr.appendChild(ratingTd);
    tr.appendChild(distTd);
    tbody.appendChild(tr);
  });
}

// =========================
// 3. 周辺施設検索（Google Places API）
// =========================
function searchNearbyPlaces() {
  const locationStr = document
    .getElementById("centerLocation")
    .value.trim();
  const type = document.getElementById("placeType").value;

  if (!locationStr) {
    alert("目的地を入力してください");
    return;
  }

  // 1. テキスト検索で中心座標取得
  const request = {
    query: locationStr,
    fields: ["name", "geometry"],
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    if (
      status !== google.maps.places.PlacesServiceStatus.OK ||
      !results ||
      results.length === 0
    ) {
      alert("場所が見つかりませんでした");
      return;
    }

    const centerPlace = results[0];
    const center = centerPlace.geometry.location;

    map.setCenter(center);
    map.setZoom(15);

    // 中心マーカー
    clearMarkers();
    addMarker(center, `${locationStr}（中心）`);

    // 2. 周辺の施設検索
    const nearbyRequest = {
      location: center,
      radius: 1000, // 1km
      type: [type],
    };

    placesService.nearbySearch(nearbyRequest, (places, nStatus) => {
      const placesList = document.getElementById("placesList");
      placesList.innerHTML = "";

      if (
        nStatus !== google.maps.places.PlacesServiceStatus.OK ||
        !places ||
        places.length === 0
      ) {
        placesList.innerHTML = "<li>該当する施設が見つかりませんでした</li>";
        return;
      }

      places.forEach((place) => {
        if (!place.geometry || !place.geometry.location) return;

        const li = document.createElement("li");
        li.textContent = `${place.name}（評価 ${
          place.rating ?? "N/A"
        }）`;
        li.addEventListener("click", () => {
          map.panTo(place.geometry.location);
          map.setZoom(17);
        });

        placesList.appendChild(li);
        addMarker(place.geometry.location, place.name);
      });
    });
  });
}

// =========================
// 4. 最短ルート算出（Directions API）
// =========================
function calculateOptimizedRoute() {
  const start = document.getElementById("routeStart").value.trim();
  const waypointsStr = document
    .getElementById("routeWaypoints")
    .value.trim();
  const end = document.getElementById("routeEnd").value.trim();

  if (!start) {
    alert("出発地を入力してください");
    return;
  }
  if (!waypointsStr) {
    alert("少なくとも1つの経由地を入力してください");
    return;
  }

  const waypointNames = waypointsStr
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  const waypoints = waypointNames.map((address) => ({
    location: address,
    stopover: true,
  }));

  const destination = end || start; // 終点未指定なら出発地に戻る

  const request = {
    origin: start,
    destination,
    waypoints,
    optimizeWaypoints: true, // 最適化フラグ
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status !== google.maps.DirectionsStatus.OK) {
      alert("ルートの計算に失敗しました：" + status);
      return;
    }

    directionsRenderer.setDirections(result);

    const route = result.routes[0];
    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach((leg) => {
      totalDistance += leg.distance.value; // m
      totalDuration += leg.duration.value; // sec
    });

    const distanceKm = (totalDistance / 1000).toFixed(1);
    const durationMin = Math.round(totalDuration / 60);

    const order = route.waypoint_order; // ex: [2, 0, 1]
    const orderedNames = order.map((idx) => waypointNames[idx]);

    let infoText = "";
    infoText += `推定合計距離：${distanceKm} km\n`;
    infoText += `推定合計時間：${durationMin} 分\n\n`;
    infoText += "訪問順序（最適化後）:\n";
    infoText += `出発：${start}\n`;
    orderedNames.forEach((name, i) => {
      infoText += `  ${i + 1}. ${name}\n`;
    });
    infoText += `到着：${destination}`;

    document.getElementById("routeInfo").textContent = infoText;
  });
}

// =========================
// マーカー関連ユーティリティ
// =========================
function addMarker(position, title) {
  const marker = new google.maps.Marker({
    map,
    position,
    title,
  });
  markers.push(marker);
}

function clearMarkers() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
}
