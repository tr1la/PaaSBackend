require("dotenv").config({ path: __dirname + "/../../.env" });
const {
  SNSClient,
  CreateTopicCommand,
  DeleteTopicCommand,
  SubscribeCommand,
  PublishCommand,
  ListSubscriptionsByTopicCommand,
  UnsubscribeCommand,
} = require("@aws-sdk/client-sns");

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

/**
 * @param {string} topicName - The name of the topic to create.
 */
const createTopic = async (topicName = "TOPIC_NAME") => {
  const response = await snsClient.send(
    new CreateTopicCommand({ Name: topicName })
  );
  console.log(response);

  return response.TopicArn;
};

const deleteTopic = async (topicArn) => {
  if (!topicArn) return;
  try {
    const response = await snsClient.send(
      new DeleteTopicCommand({ TopicArn: topicArn })
    );
    console.log(response);
  } catch (err) {
    console.error("Error deleting SNS topic:", err);
  }
};

async function subscribeToSerie(topicArn, userEmail) {
  const command = new SubscribeCommand({
    TopicArn: topicArn,
    Protocol: "email",
    Endpoint: userEmail,
  });

  const response = await snsClient.send(command);
  console.log("Subscription pending confirmation:", response);
  return response;
}

const publishToTopic = async (topicArn, subject, message) => {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Subject: subject,
      Message: message,
    });

    const response = await snsClient.send(command);
    console.log("SNS Message published:", response);
    return response;
  } catch (err) {
    console.error("Error publishing SNS message:", err);
    throw err;
  }
};
const unsubscribeFromTopic = async (topicArn, email) => {
  try {
    const listCommand = new ListSubscriptionsByTopicCommand({
      TopicArn: topicArn,
    });
    const { Subscriptions } = await snsClient.send(listCommand);

    const subscription = Subscriptions.find(
      (sub) => sub.Endpoint === email && sub.Protocol === "email"
    );

    if (!subscription) {
      throw new Error("Không tìm thấy subscription cho email đã cung cấp.");
    }

    if (subscription.SubscriptionArn === "PendingConfirmation") {
      return {
        message:
          "Email chưa xác nhận, bạn phải xác nhận đăng ký trước khi có thể hủy đăng ký.",
        pendingConfirmation: true,
      };
    }
    const unsubCommand = new UnsubscribeCommand({
      SubscriptionArn: subscription.SubscriptionArn,
    });

    await snsClient.send(unsubCommand);
    console.log(`Đã hủy đăng ký: ${email}`);
    return {
      message: `Đã hủy đăng ký: ${email}`,
      pendingConfirmation: false,
    };
  } catch (err) {
    console.error("Error unsubscribing from topic:", err);
    throw err;
  }
};

module.exports = {
  createTopic,
  deleteTopic,
  subscribeToSerie,
  publishToTopic,
  unsubscribeFromTopic,
};
