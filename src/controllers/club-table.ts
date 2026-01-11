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

    const currentSeasonName: string | null = clubData.current_season_name ?? null;
    const seasonYearFromName = currentSeasonName
      ? Number(String(currentSeasonName).match(/\b(20\d{2})\b/)?.[1])
      : NaN;
    const seasonYear = Number.isFinite(seasonYearFromName)
      ? seasonYearFromName
      : new Date().getFullYear();

    const { data: weeklyStatsData, error: weeklyStatsError } = await supabase
      .from("player_weekly_stats")
      .select("player_application_id, week_number, season_year, weekly_points")
      .eq("club_id", clubId)
      .eq("season_year", seasonYear)
      .in("player_application_id", playerIds);

    if (weeklyStatsError) {
      logger.error("Error fetching player weekly stats:", weeklyStatsError);
      return res.status(400).json({
        status: "failed",
        message: weeklyStatsError.message
      });
    }

    const statsMap = new Map();
    (statsData || []).forEach(stat => {
      statsMap.set(stat.player_application_id, stat);
    });

    const weeklyStatsMap = new Map<string, Record<string, number>>();
    (weeklyStatsData || []).forEach((row: any) => {
      const appId = row?.player_application_id as string | undefined;
      const weekNumber = Number(row?.week_number);
      const points = Number(row?.weekly_points ?? 0);
      if (!appId || !Number.isFinite(weekNumber) || weekNumber < 1) return;

      const existing = weeklyStatsMap.get(appId) ?? {};
      existing[`week_${weekNumber}_points`] = points;
      weeklyStatsMap.set(appId, existing);
    });

    const processedPlayers = playersData.map(player => {
      const stats = statsMap.get(player.id) || {};
      const weeklyStats = weeklyStatsMap.get(player.id) || {};

      const weeklyPoints = Array.from({ length: 12 }, (_v, i) => {
        const week = i + 1;
        return (weeklyStats as any)[`week_${week}_points`] || 0;
      });

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
          week1: (weeklyStats as any).week_1_points || 0,
          week2: (weeklyStats as any).week_2_points || 0,
          week3: (weeklyStats as any).week_3_points || 0,
          week4: (weeklyStats as any).week_4_points || 0,
          week5: (weeklyStats as any).week_5_points || 0,
          week6: (weeklyStats as any).week_6_points || 0,
          week7: (weeklyStats as any).week_7_points || 0,
          week8: (weeklyStats as any).week_8_points || 0,
          week9: (weeklyStats as any).week_9_points || 0,
          week10: (weeklyStats as any).week_10_points || 0,
          week11: (weeklyStats as any).week_11_points || 0,
          week12: (weeklyStats as any).week_12_points || 0,
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