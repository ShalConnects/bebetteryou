// Mongoose plugins can be added here
// Example: soft delete, timestamps, etc.

export const softDeletePlugin = (schema) => {
  schema.add({
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  })

  schema.pre('find', function() {
    this.where({ deleted: { $ne: true } })
  })

  schema.pre('findOne', function() {
    this.where({ deleted: { $ne: true } })
  })

  schema.methods.softDelete = function() {
    this.deleted = true
    this.deletedAt = new Date()
    return this.save()
  }

  schema.methods.restore = function() {
    this.deleted = false
    this.deletedAt = undefined
    return this.save()
  }
}

export const timestampsPlugin = (schema) => {
  schema.add({
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  })

  schema.pre('save', function(next) {
    this.updatedAt = Date.now()
    next()
  })
}
