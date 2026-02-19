// =========================
// Google Maps 関連
// =========================
let map;
let markers = [];
let directionsService;
let directionsRenderer;
let placesService;

let hotelMarkers = [];
let placeMarkers = [];

// 複数日用プランデータ
// tripPlan[dayIndex] = {
//   startTime: "09:00",
//   endTime: "20:00",
//   airportArrivalTime: "",
//   destinations: [{ place: "浅草寺", time: "10:00" }, ...]
// }
let tripPlan = [];

// =========================
// 初期化（index.html の callback=initMap）
// =========================
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
  initMultiDayPlan();
  initWaypointRows();
}

// =========================
// 複数日プラン初期化
// =========================
function initMultiDayPlan() {
  const tripDaysInput = document.getElementById("tripDays");
  const daySelect = document.getElementById("currentDaySelect");

  tripDaysInput.addEventListener("change", () => {
    const days = Math.max(1, parseInt(tripDaysInput.value, 10) || 1);
    saveCurrentDayFromUI();       // 変更前の日の内容を保存
    buildTripPlan(days);         // データ構築
    refreshDaySelectOptions();   // セレクト更新
    loadDayToUI(0);              // 1日目をUIへ
  });

  daySelect.addEventListener("change", () => {
    const dayIndex = parseInt(daySelect.value, 10);
    saveCurrentDayFromUI();
    loadDayToUI(dayIndex);
  });

  // 初期セット（1日）
  buildTripPlan(parseInt(tripDaysInput.value, 10) || 1);
  refreshDaySelectOptions();
  loadDayToUI(0);

  // 「目的地を追加」ボタン
  document
    .getElementById("addDestinationBtn")
    .addEventListener("click", () => {
      addDestinationRow(); // UIに行追加
    });
}

// tripPlanをdays分だけ作る
function buildTripPlan(days) {
  // 既存データをできるだけ保持したい場合、本当はマージ処理を書くが、
  // ここでは単純に作り直す
  tripPlan = [];
  for (let i = 0; i < days; i++) {
    tripPlan.push({
      startTime: "09:00",
      endTime: "20:00",
      airportArrivalTime: "",
      destinations: [
        { place: "", time: "10:00" } // デフォルト1行
      ],
    });
  }
}

// 「表示する日」セレクトの中身を作る
function refreshDaySelectOptions() {
  const daySelect = document.getElementById("currentDaySelect");
  daySelect.innerHTML = "";
  tripPlan.forEach((_, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${i + 1}日目`;
    daySelect.appendChild(opt);
  });
}

// 現在セレクトされている日インデックス
function getCurrentDayIndex() {
  const daySelect = document.getElementById("currentDaySelect");
  return parseInt(daySelect.value, 10) || 0;
}

// 特定日(dayIndex)のデータをUIにロード
function loadDayToUI(dayIndex) {
  const dayData = tripPlan[dayIndex];

  document.getElementById("startTime").value = dayData.startTime;
  document.getElementById("endTime").value = dayData.endTime;
  document.getElementById("airportArrivalTime").value =
    dayData.airportArrivalTime || "";

  const container = document.getElementById("destinationsContainer");
  container.innerHTML = "";

  dayData.destinations.forEach((d) => {
    const row = createDestinationRow(d.place, d.time);
    container.appendChild(row);
  });

  // 行が0なら1行追加
  if (dayData.destinations.length === 0) {
    const row = createDestinationRow("", "10:00");
    container.appendChild(row);
  }
}

// UIの現在内容を tripPlan の該当日に保存
function saveCurrentDayFromUI() {
  const dayIndex = getCurrentDayIndex();
  const dayData = tripPlan[dayIndex];
  if (!dayData) return;

  dayData.startTime =
    document.getElementById("startTime").value || dayData.startTime;
  dayData.endTime =
    document.getElementById("endTime").value || dayData.endTime;
  dayData.airportArrivalTime =
    document.getElementById("airportArrivalTime").value ||
    dayData.airportArrivalTime;

  const destinationRows = Array.from(
    document.querySelectorAll("#destinationsContainer .destination-row")
  );
  const dests = destinationRows
    .map((row) => {
      const place = row.querySelector(".place-input").value.trim();
      const time = row.querySelector(".time-input").value || "";
      if (!place) return null;
      return { place, time };
    })
    .filter(Boolean);

  dayData.destinations = dests.length > 0 ? dests : [{ place: "", time: "10:00" }];
}

// 目的地行を1行作る（place/time指定可）
function createDestinationRow(placeValue = "", timeValue = "10:00") {
  const row = document.createElement("div");
  row.className = "destination-row";

  const placeInput = document.createElement("input");
  placeInput.type = "text";
  placeInput.placeholder = "目的地（例：浅草寺）";
  placeInput.className = "place-input";
  placeInput.value = placeValue;

  const timeInput = document.createElement("input");
  timeInput.type = "time";
  timeInput.value = timeValue;
  timeInput.className = "time-input";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "削除";
  removeBtn.className = "remove-row-btn";
  removeBtn.onclick = () => {
    const container = document.getElementById("destinationsContainer");
    if (container.children.length > 1) {
      container.removeChild(row);
    }
  };

  row.appendChild(placeInput);
  row.appendChild(timeInput);
  row.appendChild(removeBtn);
  return row;
}

// 「目的地を追加」ボタンから呼ぶ
function addDestinationRow() {
  const container = document.getElementById("destinationsContainer");
  const row = createDestinationRow();
  container.appendChild(row);
}

// =========================
// 経由地行（ルート検索用）初期化
// =========================
function initWaypointRows() {
  // 初期1行
  addWaypointRow();

  document
    .getElementById("addWaypointBtn")
    .addEventListener("click", addWaypointRow);
}

function addWaypointRow() {
  const container = document.getElementById("waypointsContainer");
  const row = document.createElement("div");
  row.className = "waypoint-row";

  const wpInput = document.createElement("input");
  wpInput.type = "text";
  wpInput.placeholder = "経由地（例：浅草寺）";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "削除";
  removeBtn.className = "remove-row-btn";
  removeBtn.onclick = () => {
    if (container.children.length > 1) {
      container.removeChild(row);
    }
  };

  row.appendChild(wpInput);
  row.appendChild(removeBtn);

  container.appendChild(row);
}

// =========================
// イベントハンドラ設定
// =========================
function attachEventHandlers() {
  document
    .getElementById("generateScheduleBtn")
    .addEventListener("click", generateAllDaysSchedule);

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
// 1. 全日程スケジュール作成
// =========================
function generateAllDaysSchedule() {
  const departurePlace =
    document.getElementById("departurePlace").value.trim() || "出発地";

  // 現在表示中の日の内容を保存
  saveCurrentDayFromUI();

  // 旅行開始日
  const startDateStr = document.getElementById("tripStartDate").value || "";
  let startDate = null;
  if (startDateStr) {
    startDate = new Date(startDateStr + "T00:00:00");
  }

  let allLines = [];

  tripPlan.forEach((dayData, index) => {
    const dayIndex = index; // 0-based
    // 日付計算
    let dateLabel = "";
    if (startDate) {
      const d = new Date(startDate.getTime());
      d.setDate(d.getDate() + dayIndex);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dateLabel = `${y}/${m}/${day}`;
    }

    allLines.push(
      `=== ${dayIndex + 1}日目${dateLabel ? " (" + dateLabel + ")" : ""} ===`
    );
    const lines = generateScheduleForOneDay(dayData, departurePlace);
    allLines = allLines.concat(lines);
    allLines.push(""); // 空行
  });

  document.getElementById("scheduleResult").textContent =
    allLines.join("\n");

  // 出発場所をマップで表示
  if (departurePlace && departurePlace !== "出発地") {
    geocodeAndCenter(departurePlace);
  }
}

// 1日分スケジュール生成（DOMを参照せず、dayDataから計算）
function generateScheduleForOneDay(dayData, departurePlace) {
  const lines = [];

  const startTime = dayData.startTime || "09:00";
  const endTime = dayData.endTime || "20:00";
  const airportArrivalTime = dayData.airportArrivalTime || "";

  const destinations = (dayData.destinations || []).filter(
    (d) => d.place && d.place.trim()
  );

  if (destinations.length === 0) {
    lines.push("  目的地が設定されていません。");
    return lines;
  }

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
  if (endM <= startM) {
    lines.push("  終了時間は開始時間より後にしてください。");
    return lines;
  }

  if (airportArrivalTime) {
    lines.push(`  空港到着：${airportArrivalTime}`);
  }
  lines.push(`  出発：${startTime} ${departurePlace} 出発`);

  let cursorTime = startM;

  destinations.forEach((d, index) => {
    const label = d.place;
    let arriveM;

    if (d.time) {
      arriveM = parseTimeToMinutes(d.time);
      if (arriveM < cursorTime) {
        arriveM = cursorTime; // 遅れて到着する扱い
      }
    } else {
      const remainingDest = destinations.length - index;
      const remainingM = endM - cursorTime;
      const segment = remainingM / remainingDest;
      arriveM = cursorTime + segment * 0.4;
    }

    if (cursorTime < arriveM) {
      lines.push(
        `  ${minutesToTimeStr(cursorTime)} 〜 ${minutesToTimeStr(
          arriveM
        )} 「${label}」へ移動`
      );
    }

    let stayM;
    if (d.time) {
      stayM = arriveM + 60;
    } else {
      const remainingM = endM - arriveM;
      stayM = arriveM + Math.min(90, Math.max(30, remainingM / 2));
    }
    if (stayM > endM) stayM = endM;

    lines.push(
      `  ${minutesToTimeStr(arriveM)} 〜 ${minutesToTimeStr(
        stayM
      )} 「${label}」観光・滞在`
    );
    cursorTime = stayM;
  });

  if (cursorTime < endM) {
    lines.push(
      `  ${minutesToTimeStr(cursorTime)} 〜 ${minutesToTimeStr(
        endM
      )} 帰路・自由時間`
    );
  }
  lines.push(`  行程終了：${endTime}`);

  return lines;
}

// =========================
// 2. ホテルプラン比較（ダミー版）
// =========================
function showHotelPlans() {
  const city = document.getElementById("hotelCity").value.trim() || "東京";

  document.getElementById(
    "linkJalan"
  ).href = `https://www.jalan.net/uw/uwp2011/uww2011init.do?lKzn=${encodeURIComponent(
    city
  )}`;
  document.getElementById(
    "linkRakuten"
  ).href = `https://travel.rakuten.co.jp/hotel/${encodeURIComponent(
    city
  )}/`;
  document.getElementById(
    "linkAgoda"
  ).href = `https://www.agoda.com/ja-jp/search?city=${encodeURIComponent(
    city
  )}`;

  const dummyHotels = [
    {
      name: `${city} セントラルホテル`,
      price: 12000,
      rating: 4.3,
      lat: 35.6811,
      lng: 139.7672,
      sites: ["じゃらん", "楽天", "Agoda"],
    },
    {
      name: `${city} ビジネスイン`,
      price: 8000,
      rating: 3.9,
      lat: 35.684,
      lng: 139.771,
      sites: ["楽天", "Agoda"],
    },
    {
      name: `${city} ラグジュアリーホテル`,
      price: 22000,
      rating: 4.7,
      lat: 35.676,
      lng: 139.765,
      sites: ["じゃらん", "Agoda"],
    },
  ];

  // 最安値順にソート
  dummyHotels.sort((a, b) => a.price - b.price);

  const tbody = document.querySelector("#hotelTable tbody");
  tbody.innerHTML = "";

  hotelMarkers.forEach((m) => m.setMap(null));
  hotelMarkers = [];

  dummyHotels.forEach((hotel) => {
    const tr = document.createElement("tr");

    const pinTd = document.createElement("td");
    const pinBtn = document.createElement("button");
    pinBtn.textContent = "ピン";
    pinBtn.className = "pin-btn";
    pinBtn.onclick = () => {
      pinHotelOnMap(hotel);
    };
    pinTd.appendChild(pinBtn);

    const nameTd = document.createElement("td");
    nameTd.textContent = hotel.name;

    const priceTd = document.createElement("td");
    priceTd.textContent = `${hotel.price.toLocaleString()}円`;

    const ratingTd = document.createElement("td");
    ratingTd.textContent = hotel.rating.toFixed(1);

    const siteTd = document.createElement("td");
    siteTd.textContent = hotel.sites.join(" / ");

    tr.appendChild(pinTd);
    tr.appendChild(nameTd);
    tr.appendChild(priceTd);
    tr.appendChild(ratingTd);
    tr.appendChild(siteTd);
    tbody.appendChild(tr);
  });

  geocodeAndCenter(city);
}

function pinHotelOnMap(hotel) {
  const position = { lat: hotel.lat, lng: hotel.lng };

  const marker = new google.maps.Marker({
    map,
    position,
    title: hotel.name,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    },
  });
  hotelMarkers.push(marker);
  map.panTo(position);
  map.setZoom(15);
}

// =========================
// 3. 周辺施設検索
// =========================
function searchNearbyPlaces() {
  const locationStr = document
    .getElementById("centerLocation")
    .value.trim();
  const type = document.getElementById("placeType").value;
  const mode = document.getElementById("placeTravelMode").value;

  if (!locationStr) {
    alert("目的地を入力してください");
    return;
  }

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

    clearMarkers();
    addMarker(center, `${locationStr}（中心）`);

    placeMarkers.forEach((m) => m.setMap(null));
    placeMarkers = [];

    const nearbyRequest = {
      location: center,
      radius: 1500,
      type: [type],
    };

    placesService.nearbySearch(nearbyRequest, (places, nStatus) => {
      const placesList = document.getElementById("placesList");
      placesList.innerHTML = "";
      document.getElementById("placeRouteInfo").textContent = "";

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
          showRouteFromCenterToPlace(center, place.geometry.location, mode);
        });

        placesList.appendChild(li);

        const marker = new google.maps.Marker({
          map,
          position: place.geometry.location,
          title: place.name,
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
          },
        });
        placeMarkers.push(marker);
      });

      const nearest = findNearestPlace(center, places);
      if (nearest) {
        showRouteFromCenterToPlace(
          center,
          nearest.geometry.location,
          mode,
          true
        );
      }
    });
  });
}

function findNearestPlace(center, places) {
  if (!center || !places || places.length === 0) return null;
  let minDist = Infinity;
  let nearest = null;
  places.forEach((p) => {
    if (!p.geometry || !p.geometry.location) return;
    const loc = p.geometry.location;
    const dx = center.lat() - loc.lat();
    const dy = center.lng() - loc.lng();
    const d = dx * dx + dy * dy;
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  });
  return nearest;
}

function showRouteFromCenterToPlace(center, placeLocation, mode, isNearest) {
  const request = {
    origin: center,
    destination: placeLocation,
    travelMode: google.maps.TravelMode[mode],
  };

  directionsService.route(request, (result, status) => {
    if (status !== google.maps.DirectionsStatus.OK) {
      console.warn("ルート計算失敗: ", status);
      return;
    }
    directionsRenderer.setDirections(result);

    const leg = result.routes[0].legs[0];
    const distanceText = leg.distance.text;
    const durationText = leg.duration.text;

    const infoElement = document.getElementById("placeRouteInfo");
    if (isNearest) {
      infoElement.textContent =
        `中心から最も近い施設までのルート（${mode}）:\n` +
        `距離：${distanceText}\n時間：${durationText}`;
    } else {
      infoElement.textContent =
        `選択した施設までのルート（${mode}）:\n` +
        `距離：${distanceText}\n時間：${durationText}`;
    }
  });
}

// =========================
// 4. 最短ルート算出
// =========================
function calculateOptimizedRoute() {
  const start = document.getElementById("routeStart").value.trim();
  const end = document.getElementById("routeEnd").value.trim();
  const mode = document.getElementById("routeTravelMode").value;

  if (!start) {
    alert("出発地を入力してください");
    return;
  }

  const waypointInputs = Array.from(
    document.querySelectorAll("#waypointsContainer .waypoint-row input")
  );
  const waypointNames = waypointInputs
    .map((i) => i.value.trim())
    .filter(Boolean);

  if (waypointNames.length === 0) {
    alert("少なくとも1つの経由地を入力してください");
    return;
  }

  const waypoints = waypointNames.map((address) => ({
    location: address,
    stopover: true,
  }));

  const destination = end || start;

  const request = {
    origin: start,
    destination,
    waypoints,
    optimizeWaypoints: true,
    travelMode: google.maps.TravelMode[mode],
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
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });

    const distanceKm = (totalDistance / 1000).toFixed(1);
    const durationMin = Math.round(totalDuration / 60);

    const order = route.waypoint_order;
    const orderedNames = order.map((idx) => waypointNames[idx]);

    let infoText = "";
    infoText += `移動手段：${mode}\n`;
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
// マーカー関連
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

// 地名 → 座標 → マップ移動
function geocodeAndCenter(address) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address }, (results, status) => {
    if (status === "OK" && results[0]) {
      const loc = results[0].geometry.location;
      map.setCenter(loc);
      map.setZoom(13);
      addMarker(loc, address);
    } else {
      console.warn("Geocode失敗: ", status);
    }
  });
}
