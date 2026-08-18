const connectDB = require("../database/db");
const feedRepository = require("../repositories/feed.repository");
const { rankVideos } = require("./ranking");


// ======================================================
// FETCH USER INTERESTS
// ======================================================

const getUserInterests = async (userId) => {
    if (!userId) return null;

    const db = await connectDB();

    // ------------------------------------------
    // 1. Fetch activity-based interests
    // ------------------------------------------

    const activityRows = await db.all(
        `SELECT
            ui.activity_type,
            v.category,
            v.user_id AS video_owner_id,
            ui.created_at
         FROM user_interest ui
         JOIN videos v
           ON v.id = ui.video_id
         WHERE ui.user_id = ?
         ORDER BY ui.created_at DESC
         LIMIT 500`,
        [userId]
    );

    // ------------------------------------------
    // 2. Calculate category interest scores
    // ------------------------------------------

    const categoryScores = {};

    for (const row of activityRows) {
        let weight = 1;

        switch (row.activity_type) {
            case "view":
                weight = 1;
                break;

            case "like":
                weight = 3;
                break;

            case "comment":
                weight = 5;
                break;

            case "unlike":
                weight = -3;
                break;

            case "comment_delete":
                weight = -5;
                break;

            default:
                weight = 0;
        }

        if (!row.category || weight === 0) {
            continue;
        }

        const categories = row.category
            .split(",")
            .map(category => category.trim().toLowerCase())
            .filter(Boolean);

        for (const category of categories) {
            categoryScores[category] =
                (categoryScores[category] || 0) + weight;
        }
    }

    // ------------------------------------------
    // 3. Get strongest interests
    // ------------------------------------------

    const categories = Object.entries(categoryScores)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([category]) => category);

    // ------------------------------------------
    // 4. Fetch user's subscriptions
    // ------------------------------------------

    const subscriptionRows = await db.all(
        `SELECT subscribed_to_id
         FROM user_subscriptions
         WHERE subscriber_id = ?`,
        [userId]
    );

    const subscribedUsers = subscriptionRows.map(
        row => row.subscribed_to_id
    );

    // ------------------------------------------
    // 5. Return complete personalization data
    // ------------------------------------------

    return {
        categories,
        categoryScores,
        subscribedUsers
    };
};


// ======================================================
// APPLY PERSONALIZATION
// ======================================================

const applyPersonalization = async (userId) => {

    let filters = {};
    let orderBy = "created_at DESC, id DESC";

    if (!userId) {
        return {
            filters,
            orderBy: "score DESC"
        };
    }

    const interests = await getUserInterests(userId);

    if (!interests) {
        return {
            filters,
            orderBy: "score DESC"
        };
    }

    if (interests.categories.length > 0) {
        filters.categories = interests.categories;
    }

    if (interests.subscribedUsers.length > 0) {
        filters.subscribedUsers = interests.subscribedUsers;
    }

    // No personalization data
    if (
        interests.categories.length === 0 &&
        interests.subscribedUsers.length === 0
    ) {
        orderBy = "score DESC";
    }

    return {
        filters,
        orderBy
    };
};


// ======================================================
// GET FEED
// ======================================================

const getFeed = async ({ limit, cursor, userId }) => {

    const safeLimit = Math.min(
        Math.max(parseInt(limit, 10) || 20, 1),
        50
    );

    const fetchLimit = safeLimit + 1;

    // Personalization
    const {
        filters,
        orderBy
    } = await applyPersonalization(userId);

    // Candidate videos
    const rows = await feedRepository.getFeedCandidates({
        limit: fetchLimit,
        cursor,
        filters,
        orderBy
    });

    // Pagination
    let hasMore = false;
    let videos = rows;

    if (rows.length > safeLimit) {
        hasMore = true;
        videos = rows.slice(0, safeLimit);
    }

    // Ranking
    const user = userId
        ? {
            id: userId
        }
        : null;

    const ranked = rankVideos(
        videos,
        user
    );

    // Cursor
    let nextCursor = null;

    if (hasMore && ranked.length > 0) {
        const last = ranked[ranked.length - 1];

        const payload = {
            created_at: last.created_at,
            id: last.id
        };

        nextCursor = Buffer
            .from(JSON.stringify(payload))
            .toString("base64");
    }

    return {
        videos: ranked,
        nextCursor,
        hasMore
    };
};


module.exports = {
    getFeed,
    getUserInterests
};