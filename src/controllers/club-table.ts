import { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import logger from "../utils/logger";

export const getClubPlayersStats = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;
    
    if (!clubId) {
      return res.status(400).json({
        status: "failed",
        message: "Club ID is required"
      });
    }

    const { data: clubData, error: clubError } = await supabase
      .from("clubs")
      .select("current_season_name")
      .eq("id", clubId)
      .single();

    if (clubError || !clubData) {
      return res.status(404).json({
        status: "failed",
        message: "Club not found"
      });
    }

    // Fetch player applications
    const { data: playersData, error: playersError } = await supabase
      .from("player_applications")
      .select("id, full_name, position")
      .eq("club_id", clubId)
      .eq("status", "approved");

    if (playersError) {
      logger.error("Error fetching players:", playersError);
      return res.status(400).json({
        status: "failed",
        message: playersError.message
      });
    }

    if (!playersData || playersData.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "Club players stats fetched successfully",
        data: {
          clubId,
          currentSeason: clubData.current_season_name,
          players: [],
          totalPlayers: 0
        }
      });
    }

    const playerIds = playersData.map(player => player.id);

    // Fetch player stats
    const { data: statsData, error: statsError } = await supabase
      .from("player_stats")
      .select("player_application_id, goals, assists, yellow_cards, red_cards, appearances, points")
      .in("player_application_id", playerIds);

    if (statsError) {
      logger.error("Error fetching player stats:", statsError);
      return res.status(400).json({
        status: "failed",
        message: statsError.message
      });
    }

    // Fetch player weekly stats
    const { data: weeklyStatsData, error: weeklyStatsError } = await supabase
      .from("player_weekly_stats")
      .select(`
        player_iapplication_id,
        week_1_points,
        week_2_points,
        week_3_points,
        week_4_points,
        week_5_points,
        week_6_points,
        week_7_points,
        week_8_points,
        week_9_points,
        week_10_points,
        week_11_points,
        week_12_points
      `)
      .in("player_id", playerIds);

    if (weeklyStatsError) {
      logger.error("Error fetching player weekly stats:", weeklyStatsError);
      return res.status(400).json({
        status: "failed",
        message: weeklyStatsError.message
      });
    }

    // Create lookup maps for efficiency
    const statsMap = new Map();
    (statsData || []).forEach(stat => {
      statsMap.set(stat.player_application_id, stat);
    });

    const weeklyStatsMap = new Map();
    (weeklyStatsData || []).forEach(weeklyStat => {
    //   weeklyStatsMap.set(weeklyStat.player_application_id, weeklyStat);
    });

    // Process and combine the data
    const processedPlayers = playersData.map(player => {
      const stats = statsMap.get(player.id) || {};
      const weeklyStats = weeklyStatsMap.get(player.id) || {};

      const weeklyPoints = [
        weeklyStats.week_1_points || 0,
        weeklyStats.week_2_points || 0,
        weeklyStats.week_3_points || 0,
        weeklyStats.week_4_points || 0,
        weeklyStats.week_5_points || 0,
        weeklyStats.week_6_points || 0,
        weeklyStats.week_7_points || 0,
        weeklyStats.week_8_points || 0,
        weeklyStats.week_9_points || 0,
        weeklyStats.week_10_points || 0,
        weeklyStats.week_11_points || 0,
        weeklyStats.week_12_points || 0,
      ];

      const totalWeeklyScore = weeklyPoints.reduce((sum, points) => sum + points, 0);

      return {
        id: player.id,
        name: player.full_name,
        position: player.position || "N/A",
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        yellowCards: stats.yellow_cards || 0,
        redCards: stats.red_cards || 0,
        appearances: stats.appearances || 0,
        points: stats.points || 0,
        weeklyPoints: {
          week1: weeklyStats.week_1_points || 0,
          week2: weeklyStats.week_2_points || 0,
          week3: weeklyStats.week_3_points || 0,
          week4: weeklyStats.week_4_points || 0,
          week5: weeklyStats.week_5_points || 0,
          week6: weeklyStats.week_6_points || 0,
          week7: weeklyStats.week_7_points || 0,
          week8: weeklyStats.week_8_points || 0,
          week9: weeklyStats.week_9_points || 0,
          week10: weeklyStats.week_10_points || 0,
          week11: weeklyStats.week_11_points || 0,
          week12: weeklyStats.week_12_points || 0,
        },
        totalWeeklyScore
      };
    });

    processedPlayers.sort((a, b) => b.totalWeeklyScore - a.totalWeeklyScore);

    return res.status(200).json({
      status: "success",
      message: "Club players stats fetched successfully",
      data: {
        clubId,
        currentSeason: clubData.current_season_name,
        players: processedPlayers,
        totalPlayers: processedPlayers.length
      }
    });

  } catch (err: any) {
    logger.error("getClubPlayersStats error:", err);
    return res.status(500).json({
      status: "failed",
      message: err.message || "Internal Server Error"
    });
  }
};