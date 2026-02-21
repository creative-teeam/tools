// =========================
// Google Maps 関連
// =========================
let map;
let markers = [];        // 汎用マーカー（出発地などに使用）
let directionsService;
let directionsRenderer;
let placesService;

let placeMarkers = [];   // 周辺施設用マーカー

// 複数日プランデータ
// tripPlan[dayIndex] = {
//   startTime, endTime, airportArrivalTime,
//   destinations: [{ place, time }]
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
    saveCurrentDayFromUI();
    buildTripPlan(days);
    refreshDaySelectOptions();
    loadDayToUI(0);
  });

  daySelect.addEventListener("change", () => {
    const dayIndex = parseInt(daySelect.value, 10);
    saveCurrentDayFromUI();
    loadDayToUI(dayIndex);
  });

  // 初期セット
  buildTripPlan(parseInt(tripDaysInput.value, 10) || 1);
  refreshDaySelectOptions();
  loadDayToUI(0);

  // 目的地追加ボタン
  document
    .getElementById("addDestinationBtn")
    .addEventListener("click", () => {
      addDestinationRow();
    });
}

function buildTripPlan(days) {
  tripPlan = [];
  for (let i = 0; i < days; i++) {
    tripPlan.push({
      startTime: "09:00",
      endTime: "20:00",
      airportArrivalTime: "",
      destinations: [{ place: "", time: "10:00" }],
    });
  }
}

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

function getCurrentDayIndex() {
  const daySelect = document.getElementById("currentDaySelect");
  return parseInt(daySelect.value, 10) || 0;
}

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

  if (dayData.destinations.length === 0) {
    container.appendChild(createDestinationRow("", "10:00"));
  }
}

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

  dayData.destinations =
    dests.length > 0 ? dests : [{ place: "", time: "10:00" }];
}

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

function addDestinationRow() {
  const container = document.getElementById("destinationsContainer");
  container.appendChild(createDestinationRow());
}

// =========================
// 経由地行（ルート検索用）初期化
// =========================
function initWaypointRows() {
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
// イベントハンドラ
// =========================
function attachEventHandlers() {
  document
    .getElementById("generateScheduleBtn")
    .addEventListener("click", generateAllDaysSchedule);

  document
    .getElementById("updateHotelLinksBtn")
    .addEventListener("click", updateHotelLinks);

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

  saveCurrentDayFromUI();

  const startDateStr = document.getElementById("tripStartDate").value || "";
  let startDate = null;
  if (startDateStr) {
    startDate = new Date(startDateStr + "T00:00:00");
  }

  let allLines = [];

  tripPlan.forEach((dayData, index) => {
    const dayIndex = index;
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
    allLines.push("");
  });

  document.getElementById("scheduleResult").textContent =
    allLines.join("\n");

  if (departurePlace && departurePlace !== "出発地") {
    geocodeAndCenter(departurePlace);
  }
}

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
        arriveM = cursorTime;
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
// 2. ホテルプラン比較：リンク更新のみ
// =========================
function updateHotelLinks() {
  const city = document.getElementById("hotelCity").value.trim() || "東京";
  const encoded = encodeURIComponent(city);

  document.getElementById(
    "linkRakuten"
  ).href = `https://travel.rakuten.co.jp/hotel/${encoded}/`;

  document.getElementById(
    "linkJalan"
  ).href = `https://www.jalan.net/uw/uwp2011/uww2011init.do?lKzn=${encoded}`;

  document.getElementById(
    "linkYahooTravel"
  ).href = `https://travel.yahoo.co.jp/search/?kw=${encoded}`;

  document.getElementById(
    "linkJTB"
  ).href = `https://www.jtb.co.jp/kokunai_hotel/list/${encoded}/`;

  document.getElementById(
    "linkRurubu"
  ).href = `https://rurubu.travel/hotel/list/${encoded}`;

  document.getElementById(
    "linkAgoda"
  ).href = `https://www.agoda.com/ja-jp/search?city=${encoded}`;

  document.getElementById(
    "linkTrivago"
  ).href = `https://www.trivago.jp/?aCity=${encoded}`;
}

// =========================
// 3. 周辺施設検索
//  - 目的地にはピンを立てない
//  - ジャンルに絞った最大20件にピン留め（検索直後に全部）
//  - リストクリック時、選択中の移動手段で最短ルート表示
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

    // 地図の中心だけ移動（ここでは中心ピンは立てない）
    map.setCenter(center);
    map.setZoom(15);

    // 既存マーカーをすべて消す
    clearMarkers();
    placeMarkers.forEach((m) => m.setMap(null));
    placeMarkers = [];

    const baseRadius = 1000; // 1km
    const maxRadius = 5000;  // 最大5km
    const step = 1000;       // 1km刻み
    const maxResults = 20;   // 最大20件

    const placesListEl = document.getElementById("placesList");
    placesListEl.innerHTML = "";
    document.getElementById("placeRouteInfo").textContent = "";

    let collected = [];

    function searchWithRadius(radius) {
      if (radius > maxRadius || collected.length >= maxResults) {
        renderPlaces(center, collected);
        return;
      }

      const nearbyRequest = {
        location: center,
        radius: radius,
        type: [type], // 選択ジャンルで絞る
      };

      placesService.nearbySearch(nearbyRequest, (places, nStatus) => {
        if (
          nStatus === google.maps.places.PlacesServiceStatus.OK &&
          places &&
          places.length > 0
        ) {
          for (const p of places) {
            if (!p.geometry || !p.geometry.location) continue;
            if (collected.find((c) => c.place_id === p.place_id)) continue;
            collected.push(p);
            if (collected.length >= maxResults) break;
          }
        }

        if (collected.length >= maxResults || radius >= maxRadius) {
          renderPlaces(center, collected);
        } else {
          searchWithRadius(radius + step);
        }
      });
    }

    // 半径1kmから開始
    searchWithRadius(baseRadius);
  });
}

function renderPlaces(center, places) {
  const placesListEl = document.getElementById("placesList");
  placesListEl.innerHTML = "";

  if (!places || places.length === 0) {
    placesListEl.innerHTML =
      "<li>指定ジャンルの施設が近くに見つかりませんでした</li>";
    return;
  }

  placeMarkers.forEach((m) => m.setMap(null));
  placeMarkers = [];

  const travelModeSelect = document.getElementById("placeTravelMode");

  places.forEach((place) => {
    if (!place.geometry || !place.geometry.location) return;

    // リスト表示
    const li = document.createElement("li");
    li.textContent = `${place.name}（評価 ${
      place.rating ?? "N/A"
    }）`;
    li.addEventListener("click", () => {
      const mode = travelModeSelect.value; // WALKING / TRANSIT / DRIVING
      map.panTo(place.geometry.location);
      map.setZoom(17);
      showRouteFromCenterToPlace(center, place.geometry.location, mode);
    });

    placesListEl.appendChild(li);

    // 抽出した最大20件をすべてピン留め
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

  document.getElementById("placeRouteInfo").textContent =
    `該当ジャンルの施設：${places.length} 件（最大20件まで表示）`;
}

// 中心 → 選択施設 へのルートを、選択中の移動手段で表示
function showRouteFromCenterToPlace(center, placeLocation, mode) {
  const request = {
    origin: center,
    destination: placeLocation,
    travelMode: google.maps.TravelMode[mode],
  };

  // 公共交通機関のときは departureTime を指定（電車・バスルートが出やすくする）
  if (mode === "TRANSIT") {
    request.transitOptions = {
      departureTime: new Date(),
    };
  }

  directionsService.route(request, (result, status) => {
    if (status !== google.maps.DirectionsStatus.OK) {
      console.warn("ルート計算失敗: ", status);
      document.getElementById("placeRouteInfo").textContent =
        "ルートの計算に失敗しました";
      return;
    }
    directionsRenderer.setDirections(result);

    const leg = result.routes[0].legs[0];
    const distanceText = leg.distance.text;
    const durationText = leg.duration.text;

    let modeLabel = "";
    if (mode === "WALKING") modeLabel = "徒歩";
    else if (mode === "TRANSIT") modeLabel = "電車・バス（公共交通機関）";
    else if (mode === "DRIVING") modeLabel = "車";

    const infoElement = document.getElementById("placeRouteInfo");
    infoElement.textContent =
      `選択した施設までのルート（${modeLabel}）:\n` +
      `距離：${distanceText}\n時間：${durationText}`;
  });
}

// =========================
// 4. 最短ルート算出（複数地点）
//  - TRANSIT（電車・バス）のルートを出やすくするため transitOptions 設定
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
    travelMode: google.maps.TravelMode[mode], // WALKING/DRIVING/TRANSIT
  };

  if (mode === "TRANSIT") {
    // 出発時刻を現在時刻にして、電車・バスルートが出るようにする
    request.transitOptions = {
      departureTime: new Date(),
    };
  }

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

    let modeLabel = "";
    if (mode === "WALKING") modeLabel = "徒歩";
    else if (mode === "TRANSIT") modeLabel = "電車・バス（公共交通機関）";
    else if (mode === "DRIVING") modeLabel = "自動車";

    let infoText = "";
    infoText += `移動手段：${modeLabel}\n`;
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
