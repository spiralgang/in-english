const { getNewsApi } = require('newsapi');
const { getTipsApi } = require('tipsapi');
const { getScheduleApi } = require('scheduleapi');
const { getWeatherApi } = require('weatherapi');

const getNews = async () => {
  const api = new getNewsApi();
  const news = await api.getNews();
  return news;
};

const getTips = async () => {
  const api = new getTipsApi();
  const tips = await api.getTips();
  return tips;
};

const getSchedule = async () => {
  const api = new getScheduleApi();
  const schedule = await api.getSchedule();
  return schedule;
};

const getWeather = async () => {
  const api = new getWeatherApi();
  const weather = await api.getWeather();
  return weather;
};

module.exports = { getNews, getTips, getSchedule, getWeather };
//
