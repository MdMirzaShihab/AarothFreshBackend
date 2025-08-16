const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Migration script to update user role from 'owner' to 'restaurantOwner'
 * This fixes the inconsistency between old database records and the updated User schema
 */
async function migrateOwnerRole() {
  try {
    // Connect to MongoDB
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to database successfully');

    // Find all users with role 'owner'
    console.log('Finding users with role "owner"...');
    const usersWithOwnerRole = await User.find({ role: 'owner' });
    console.log(`Found ${usersWithOwnerRole.length} users with role "owner"`);

    if (usersWithOwnerRole.length === 0) {
      console.log('No users found with role "owner". Migration not needed.');
      await mongoose.connection.close();
      return;
    }

    // Display users to be updated
    console.log('\nUsers to be updated:');
    usersWithOwnerRole.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    // Update all users with role 'owner' to 'restaurantOwner'
    console.log('\nUpdating user roles...');
    const updateResult = await User.updateMany(
      { role: 'owner' },
      { $set: { role: 'restaurantOwner' } }
    );

    console.log(`Successfully updated ${updateResult.modifiedCount} users`);

    // Verify the changes
    console.log('\nVerifying changes...');
    const remainingOwnerUsers = await User.find({ role: 'owner' });
    const updatedUsers = await User.find({ role: 'restaurantOwner' });
    
    console.log(`Users still with role "owner": ${remainingOwnerUsers.length}`);
    console.log(`Users now with role "restaurantOwner": ${updatedUsers.length}`);

    if (remainingOwnerUsers.length === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n❌ Migration incomplete. Some users still have role "owner"');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateOwnerRole();
}

module.exports = migrateOwnerRole;