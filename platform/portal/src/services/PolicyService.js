const axios = require('axios');

const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';

class PolicyService {
  async evaluate(policy, input) {
    const { data } = await axios.post(
      `${OPA_URL}/v1/data/${policy}`,
      { input },
      { timeout: 3000 }
    );
    return data.result;
  }

  async checkSchemaRegistration({ schema, subject, requester }) {
    const result = await this.evaluate('datamesh/schema/allow', {
      schema,
      subject,
      requester,
      action: 'register'
    });

    return {
      allowed: result?.allow === true,
      violations: result?.violations || []
    };
  }

  async checkTopicAccess({ topicName, requester, action }) {
    const result = await this.evaluate('datamesh/topic/allow', {
      topic: topicName,
      requester,
      action
    });
    return { allowed: result?.allow === true, violations: result?.violations || [] };
  }

  async checkDataAccess({ resource, requester, action }) {
    const result = await this.evaluate('datamesh/data/allow', {
      resource,
      requester,
      action
    });
    return { allowed: result?.allow === true, violations: result?.violations || [] };
  }
}

module.exports = new PolicyService();
