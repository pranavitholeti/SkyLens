const API_KEY      = "11fd3cba4a57b826c3c29834ed5feb44";
const API_URL      = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

var cityInput        = document.getElementById("city-input");
var searchBtn        = document.getElementById("search-btn");
var locationBtn      = document.getElementById("location-btn");
var weatherCard      = document.getElementById("weather-card");
var cityName         = document.getElementById("city-name");
var weatherDate      = document.getElementById("weather-date");
var weatherIcon      = document.getElementById("weather-icon");
var temperature      = document.getElementById("temperature");
var weatherCondition = document.getElementById("weather-condition");
var humidity         = document.getElementById("humidity");
var windSpeed        = document.getElementById("wind-speed");
var feelsLike        = document.getElementById("feels-like");
var loadingEl        = document.getElementById("loading");
var errorBox         = document.getElementById("error-box");
var errorMessage     = document.getElementById("error-message");
var recentSection    = document.getElementById("recent-searches");
var recentList       = document.getElementById("recent-list");
var themeToggle      = document.getElementById("theme-toggle");
var unitToggle       = document.getElementById("unit-toggle");
var bgLayer          = document.getElementById("bg-layer");
var particlesDiv     = document.getElementById("particles");
var forecastSection  = document.getElementById("forecast-section");
var forecastList     = document.getElementById("forecast-list");

var currentTempC  = null;
var currentFeelsC = null;
var isCelsius     = true;
var isDarkMode    = false;
var recentCities  = [];


searchBtn.addEventListener("click", function() { handleSearch(); });

cityInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") { handleSearch(); }
});

locationBtn.addEventListener("click", function() { getMyLocation(); });
themeToggle.addEventListener("click", function() { toggleDarkMode(); });
unitToggle.addEventListener("click", function() { toggleUnit(); });

function handleSearch() {
    var city = cityInput.value.trim();
    if (city === "") {
        showError("Please enter a city name!");
        return;
    }
    if (!isNaN(city)) {
        showError("Please enter a valid city name, not a number!");
        return;
    }
    fetchWeather(city);
}

async function fetchWeather(city) {
    showLoading();
    hideError();
    hideWeatherCard();

    if (!navigator.onLine) {
        showError("No internet connection! Please check your network.");
        hideLoading();
        return;
    }

    try {
        var url      = API_URL + "?q=" + city + "&appid=" + API_KEY + "&units=metric";
        var response = await fetch(url);

        if (response.status === 404) throw new Error("City not found! Please check the spelling.");
        if (response.status === 401) throw new Error("Invalid API key. Please check configuration.");
        if (!response.ok)            throw new Error("Something went wrong. Please try again.");

        var data = await response.json();
        displayWeather(data);
        saveRecentCity(city);
        fetchForecast(city);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}


function displayWeather(data) {
    var name          = data.name;
    var country       = data.sys.country;
    var tempC         = Math.round(data.main.temp);
    var feelsC        = Math.round(data.main.feels_like);
    var hum           = data.main.humidity;
    var wind          = (data.wind.speed * 3.6).toFixed(1);
    var condition     = data.weather[0].description;
    var iconCode      = data.weather[0].icon;
    var mainCondition = data.weather[0].main;

    currentTempC  = tempC;
    currentFeelsC = feelsC;
    isCelsius     = true;
    unitToggle.textContent = "°C";

    cityName.textContent         = name + ", " + country;
    weatherDate.textContent      = getFormattedDate();
    weatherCondition.textContent = condition;
    humidity.textContent         = hum + "%";
    windSpeed.textContent        = wind + " km/h";
    temperature.textContent      = tempC + "°C";
    feelsLike.textContent        = feelsC + "°C";
    weatherIcon.src              = "https://openweathermap.org/img/wn/" + iconCode + "@2x.png";
    weatherIcon.alt              = condition;

    changeBackground(mainCondition, iconCode);
    showWeatherCard();
}

async function fetchForecast(city) {
    try {
        var url      = FORECAST_URL + "?q=" + city + "&appid=" + API_KEY + "&units=metric";
        var response = await fetch(url);
        if (!response.ok) return;
        var data = await response.json();
        displayForecast(data);
    } catch (error) {
        console.log("Forecast error: " + error.message);
    }
}

function displayForecast(data) {
    var dailyList = [];
    for (var i = 0; i < data.list.length; i++) {
        if (i % 8 === 0) dailyList.push(data.list[i]);
        if (dailyList.length === 5) break;
    }

    forecastList.innerHTML = "";

    for (var j = 0; j < dailyList.length; j++) {
        var day     = dailyList[j];
        var date    = new Date(day.dt * 1000);
        var dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        var temp    = Math.round(day.main.temp);
        var minTemp = Math.round(day.main.temp_min);
        var cond    = day.weather[0].main;
        var emoji   = getWeatherEmoji(cond);

        var card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <p class="forecast-day">${dayName}</p>
            <span class="forecast-icon">${emoji}</span>
            <p class="forecast-temp">${temp}° <span>${minTemp}°</span></p>
        `;
        forecastList.appendChild(card);
    }

    forecastSection.classList.remove("hidden");
}

function changeBackground(condition, iconCode) {
    var isNight = iconCode.endsWith("n");

    particlesDiv.innerHTML = "";
    var oldLightning = document.querySelector(".lightning");
    if (oldLightning) oldLightning.remove();

    if (condition === "Clear") {
        if (isNight) {
            bgLayer.style.background = "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
            makeStars();
        } else {
            bgLayer.style.background = "url('assets/sunny-bg.png') center/cover no-repeat";
            makeSunParticles();
        }

    } else if (condition === "Clouds") {
        bgLayer.style.background = isNight
            ? "linear-gradient(135deg, #1a202c, #2d3748, #3a4a5c)"
            : "linear-gradient(135deg, #3a5f8a, #5b7fa6, #7fa3c4)";
        makeClouds();

    } else if (condition === "Rain" || condition === "Drizzle") {
        bgLayer.style.background = "url('assets/rainy-bg.png') center/cover no-repeat";
        makeRain();

    } else if (condition === "Thunderstorm") {
        bgLayer.style.background = "url('assets/thunder-bg.png') center/cover no-repeat";
        makeRain();
        makeLightning();

    } else if (condition === "Snow") {
        bgLayer.style.background = "url('assets/snow-bg.jpg') center/cover no-repeat";
        makeSnow();

    } else if (["Mist","Fog","Haze","Smoke"].includes(condition)) {
        bgLayer.style.background = "linear-gradient(135deg, #4a6080, #607898, #4a6080)";
        makeMist();

    } else if (condition === "Rainbow") {
        bgLayer.style.background = "url('assets/rainbow-bg.png') center/cover no-repeat";
        makeRainbowParticles();

    } else if (condition === "Flood") {
        bgLayer.style.background = "linear-gradient(135deg, #0a2a4a, #0d3d6b, #0a2a4a)";
        makeFlood();

    } else if (condition === "Tornado") {
        bgLayer.style.background = "linear-gradient(135deg, #1a1a1a, #2a3a22, #3a2820)";
        makeRain();

    } else {
        bgLayer.style.background = "linear-gradient(135deg, #0a1628, #0d2040, #0a1628)";
    }


    if (condition === "Snow" || (condition === "Clouds" && !isNight)) {
        setLightTheme();
    } else {
        setDarkTheme();
    }
}


function makeRain() {
    for (var i = 0; i < 60; i++) {
        var drop = document.createElement("div");
        drop.className = "raindrop";
        drop.style.left              = Math.random() * 100 + "%";
        drop.style.height            = (Math.random() * 20 + 10) + "px";
        drop.style.animationDuration = (Math.random() * 0.5 + 0.6) + "s";
        drop.style.animationDelay    = "-" + (Math.random() * 2) + "s";
        drop.style.opacity           = Math.random() * 0.5 + 0.3;
        particlesDiv.appendChild(drop);
    }
}

function makeSnow() {
    var flakes = ["❄", "❅", "❆", "•"];
    for (var i = 0; i < 50; i++) {
        var flake = document.createElement("div");
        flake.className   = "snowflake";
        flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        flake.style.left             = Math.random() * 100 + "%";
        flake.style.fontSize         = (Math.random() * 16 + 8) + "px";
        flake.style.animationDuration= (Math.random() * 4 + 4) + "s";
        flake.style.animationDelay   = "-" + (Math.random() * 5) + "s";
        particlesDiv.appendChild(flake);
    }
}

function makeStars() {
    for (var i = 0; i < 80; i++) {
        var star = document.createElement("div");
        star.className = "star";
        star.style.top              = Math.random() * 100 + "%";
        star.style.left             = Math.random() * 100 + "%";
        var size = Math.random() * 3 + 1;
        star.style.width            = size + "px";
        star.style.height           = size + "px";
        star.style.animationDuration= (Math.random() * 3 + 2) + "s";
        star.style.animationDelay   = "-" + (Math.random() * 3) + "s";
        particlesDiv.appendChild(star);
    }
}

function makeSunParticles() {
    for (var i = 0; i < 20; i++) {
        var orb = document.createElement("div");
        orb.className = "dust";
        var size = Math.random() * 6 + 3;
        orb.style.width            = size + "px";
        orb.style.height           = size + "px";
        orb.style.top              = Math.random() * 100 + "%";
        orb.style.left             = Math.random() * 100 + "%";
        orb.style.background       = "rgba(255,230,100," + (Math.random() * 0.4 + 0.2) + ")";
        orb.style.animationDuration= (Math.random() * 4 + 3) + "s";
        orb.style.animationDelay   = "-" + (Math.random() * 4) + "s";
        particlesDiv.appendChild(orb);
    }
}

// BEFORE: 7 inline style properties per cloud element
// AFTER:  just add class="weather-cloud", only set random values in JS
function makeClouds() {
    for (var i = 0; i < 5; i++) {
        var cloud = document.createElement("div");
        cloud.className = "weather-cloud";
        var width = Math.random() * 150 + 100;
        cloud.style.top             = Math.random() * 60 + "%";
        cloud.style.width           = width + "px";
        cloud.style.height          = (width * 0.4) + "px";
        cloud.style.animationDuration = (Math.random() * 30 + 20) + "s";
        cloud.style.animationDelay  = "-" + (Math.random() * 20) + "s";
        particlesDiv.appendChild(cloud);
    }
}

// BEFORE: 6 inline style properties per fog element
// AFTER:  just add class="weather-fog", only set random values in JS
function makeMist() {
    for (var i = 0; i < 8; i++) {
        var fog = document.createElement("div");
        fog.className = "weather-fog";
        fog.style.top             = Math.random() * 90 + "%";
        fog.style.width           = (Math.random() * 300 + 200) + "px";
        fog.style.animationDuration = (Math.random() * 15 + 10) + "s";
        fog.style.animationDelay  = "-" + (Math.random() * 10) + "s";
        particlesDiv.appendChild(fog);
    }
}

// BEFORE: needed document.createElement("style") + injecting @keyframes
// AFTER:  just append one div — .lightning and @keyframes are in CSS
function makeLightning() {
    var lightning = document.createElement("div");
    lightning.className = "lightning";
    document.body.appendChild(lightning);
}

function makeRainbowParticles() {
    for (var i = 0; i < 25; i++) {
        var drop = document.createElement("div");
        drop.className              = "raindrop";
        drop.style.left             = Math.random() * 100 + "%";
        drop.style.height           = (Math.random() * 10 + 8) + "px";
        drop.style.animationDuration= (Math.random() * 0.6 + 0.8) + "s";
        drop.style.animationDelay   = "-" + (Math.random() * 2) + "s";
        drop.style.opacity          = "0.4";
        particlesDiv.appendChild(drop);
    }
    for (var j = 0; j < 30; j++) {
        var spark = document.createElement("div");
        spark.className             = "star";
        spark.style.top             = Math.random() * 80 + "%";
        spark.style.left            = Math.random() * 100 + "%";
        var sz = Math.random() * 4 + 2;
        spark.style.width           = sz + "px";
        spark.style.height          = sz + "px";
        spark.style.background      = "rgba(255,255,255,0.9)";
        spark.style.animationDuration = (Math.random() * 2 + 1) + "s";
        spark.style.animationDelay  = "-" + (Math.random() * 2) + "s";
        particlesDiv.appendChild(spark);
    }
}

// BEFORE: 6 inline styles on water div + document.createElement("style") to inject @keyframes
// AFTER:  just add class="flood-water" — all styles and @keyframes live in CSS
function makeFlood() {
    for (var i = 0; i < 70; i++) {
        var drop = document.createElement("div");
        drop.className              = "raindrop";
        drop.style.left             = Math.random() * 100 + "%";
        drop.style.height           = (Math.random() * 20 + 15) + "px";
        drop.style.animationDuration= (Math.random() * 0.4 + 0.4) + "s";
        drop.style.animationDelay   = "-" + (Math.random() * 2) + "s";
        drop.style.opacity          = Math.random() * 0.4 + 0.5 + "";
        particlesDiv.appendChild(drop);
    }
    var water = document.createElement("div");
    water.className = "flood-water";   // all styling handled by CSS class
    particlesDiv.appendChild(water);
}


function setDarkTheme() {
    document.body.classList.remove("theme-light");
}

function setLightTheme() {
    document.body.classList.add("theme-light");
}


function toggleUnit() {
    if (currentTempC === null) return;

    if (isCelsius) {
        var tempF  = Math.round((currentTempC  * 9 / 5) + 32);
        var feelsF = Math.round((currentFeelsC * 9 / 5) + 32);
        temperature.textContent = tempF  + "°F";
        feelsLike.textContent   = feelsF + "°F";
        unitToggle.textContent  = "°F";
        isCelsius = false;
    } else {
        temperature.textContent = currentTempC  + "°C";
        feelsLike.textContent   = currentFeelsC + "°C";
        unitToggle.textContent  = "°C";
        isCelsius = true;
    }
}


// ============================================
// 14. DARK / LIGHT THEME TOGGLE (button)
// ============================================

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    } else {
        document.body.classList.remove("dark-mode");
        themeToggle.textContent = "🌙";
    }
    localStorage.setItem("skylens-theme", isDarkMode ? "dark" : "light");
}

function loadSavedTheme() {
    var savedTheme = localStorage.getItem("skylens-theme");
    if (savedTheme === "dark") {
        isDarkMode = true;
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    }
}

function saveRecentCity(city) {
    var formatted = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    var newList = [];
    for (var i = 0; i < recentCities.length; i++) {
        if (recentCities[i].toLowerCase() !== city.toLowerCase()) {
            newList.push(recentCities[i]);
        }
    }
    recentCities = newList;
    recentCities.unshift(formatted);
    if (recentCities.length > 5) recentCities = recentCities.slice(0, 5);
    localStorage.setItem("skylens-recent", JSON.stringify(recentCities));
    showRecentCities();
}

function showRecentCities() {
    if (recentCities.length === 0) {
        recentSection.classList.add("hidden");
        return;
    }
    recentSection.classList.remove("hidden");
    recentList.innerHTML = "";

    for (var i = 0; i < recentCities.length; i++) {
        var city = recentCities[i];
        var chip = document.createElement("button");
        chip.className   = "recent-chip";
        chip.textContent = city;
        chip.addEventListener("click", function() {
            cityInput.value = this.textContent;
            fetchWeather(this.textContent);
        });
        recentList.appendChild(chip);
    }
}

function loadRecentCities() {
    var saved = localStorage.getItem("skylens-recent");
    if (saved !== null) {
        recentCities = JSON.parse(saved);
        showRecentCities();
    }
}

function getMyLocation() {
    if (!navigator.geolocation) {
        showError("Your browser does not support location access.");
        return;
    }

    showLoading();
    hideError();
    hideWeatherCard();

    navigator.geolocation.getCurrentPosition(
        async function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            try {
                var url      = API_URL + "?lat=" + lat + "&lon=" + lon + "&appid=" + API_KEY + "&units=metric";
                var response = await fetch(url);
                if (!response.ok) throw new Error("Could not get weather for your location.");
                var data = await response.json();
                displayWeather(data);
                fetchForecast(data.name);
            } catch (error) {
                showError(error.message);
            } finally {
                hideLoading();
            }
        },
        function() {
            hideLoading();
            showError("Location access denied. Please search manually.");
        }
    );
}

function getFormattedDate() {
    return new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
}

function getWeatherEmoji(condition) {
    var map = {
        Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
        Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Fog: "🌫️",
        Haze: "🌫️", Smoke: "🌫️", Tornado: "🌪️", Rainbow: "🌈", Flood: "🌊"
    };
    return map[condition] || "🌤️";
}


function showLoading()    { loadingEl.classList.remove("hidden"); }
function hideLoading()    { loadingEl.classList.add("hidden"); }
function showWeatherCard(){ weatherCard.classList.remove("hidden"); }
function hideWeatherCard(){
    weatherCard.classList.add("hidden");
    forecastSection.classList.add("hidden");
}
function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove("hidden");
    hideWeatherCard();
}
function hideError() { errorBox.classList.add("hidden"); }

function init() {
    loadSavedTheme();
    loadRecentCities();
}

init();
